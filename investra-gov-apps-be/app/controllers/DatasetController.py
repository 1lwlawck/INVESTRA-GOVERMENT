"""
Dataset Controller – versioned, auditable dataset management.

Key design changes (vs. destructive replace):
  - Each CSV upload creates a new Dataset version (non-destructive).
  - Previous versions are preserved for audit trail & rollback.
  - Only one dataset is 'active' at a time; all queries scope to it.
  - AnalysisResults are linked to the dataset they were computed on.
  - Superadmin can list history, switch active version, view any version.
"""

import csv
import io
import logging

from flask import request, jsonify, g, current_app

from app.Extensions import db
from app.models.Dataset import Dataset
from app.models.Province import Province
from app.utils.ApiResponse import errorResponse

COLUMNS = ["provinsi", *Province.NUMERIC_COLUMNS]

# Aliases for CSV column names that differ from model attribute names.
# Maps CSV-header → model-attribute.  e.g. "pdrb_perkapita" → "pdrb_per_kapita"
CSV_COLUMN_ALIASES: dict[str, str] = {
    "pdrb_perkapita": "pdrb_per_kapita",
    "pdrb": "pdrb_per_kapita",
    "listrik": "akses_listrik",
}

logger = logging.getLogger(__name__)


class DatasetController:

    # ── Active Dataset Info ───────────────────────────────────

    @staticmethod
    def getInfo():
        """GET /api/dataset/default  – info about the active dataset."""
        ds = Dataset.getActive()
        if ds is None:
            return errorResponse("Tidak ada dataset aktif", "NO_ACTIVE_DATASET", 404)

        return jsonify(
            {
                **ds.toDict(),
                "column_count": len(COLUMNS),
                "columns": COLUMNS,
            }
        )

    @staticmethod
    def getData():
        """GET /api/dataset/default/data  – paginated rows of active dataset."""
        ds = Dataset.getActive()
        if ds is None:
            return errorResponse("Tidak ada dataset aktif", "NO_ACTIVE_DATASET", 404)

        page = request.args.get("page", 1, type=int)
        pageSize = request.args.get("pageSize", request.args.get("page_size", 50, type=int), type=int)
        page = max(page, 1)
        pageSize = min(max(pageSize, 1), 100)

        query = Province.query.filter_by(dataset_id=ds.id).order_by(Province.id)
        total = query.count()
        provinces = query.offset((page - 1) * pageSize).limit(pageSize).all()

        return jsonify(
            {
                "data": [p.toDict() for p in provinces],
                "columns": COLUMNS,
                "total_rows": total,
                "page": page,
                "page_size": pageSize,
                "total_pages": max(1, -(-total // pageSize)),
            }
        )

    @staticmethod
    def getSample():
        """GET /api/dataset/default/sample"""
        ds = Dataset.getActive()
        if ds is None:
            return errorResponse("Tidak ada dataset aktif", "NO_ACTIVE_DATASET", 404)

        n = request.args.get("n", 5, type=int)

        query = Province.query.filter_by(dataset_id=ds.id).order_by(Province.id)
        total = query.count()
        n = min(max(1, n), total)
        provinces = query.limit(n).all()

        return jsonify(
            {
                "data": [p.toDict() for p in provinces],
                "columns": COLUMNS,
                "total_rows": total,
                "page": 1,
                "page_size": n,
                "total_pages": 1,
            }
        )

    # ── Version History & Management ──────────────────────────

    @staticmethod
    def listVersions():
        """GET /api/dataset/versions – list all dataset versions."""
        datasets = Dataset.query.order_by(Dataset.version.desc()).all()
        return jsonify(
            {
                "versions": [ds.toDict() for ds in datasets],
                "total": len(datasets),
            }
        )

    @staticmethod
    def getVersion(versionId: int):
        """GET /api/dataset/versions/<id> – info about a specific version."""
        ds = Dataset.query.get(versionId)
        if ds is None:
            return errorResponse("Dataset version tidak ditemukan", "DATASET_VERSION_NOT_FOUND", 404)

        provinces = Province.query.filter_by(dataset_id=ds.id).order_by(Province.id).all()

        return jsonify(
            {
                **ds.toDict(),
                "column_count": len(COLUMNS),
                "columns": COLUMNS,
                "data": [p.toDict() for p in provinces],
            }
        )

    @staticmethod
    def activateVersion(versionId: int):
        """PUT /api/dataset/versions/<id>/activate – set a version as active."""
        target = Dataset.query.get(versionId)
        if target is None:
            return errorResponse("Dataset version tidak ditemukan", "DATASET_VERSION_NOT_FOUND", 404)

        if target.is_active:
            return jsonify({"message": "Dataset sudah aktif", **target.toDict()})

        try:
            # Deactivate all
            Dataset.query.filter_by(is_active=True).update({"is_active": False})
            # Activate target
            target.is_active = True
            db.session.commit()
        except Exception:
            db.session.rollback()
            logger.exception("Failed to activate dataset version id=%s", versionId)
            return errorResponse("Gagal mengaktifkan dataset", "DATASET_ACTIVATION_FAILED", 500)

        return jsonify(
            {
                "message": f"Dataset v{target.version} berhasil diaktifkan",
                **target.toDict(),
            }
        )

    # ── CSV Upload (non-destructive) ──────────────────────────

    REQUIRED_COLUMNS = {"provinsi", *Province.NUMERIC_COLUMNS}

    @staticmethod
    def uploadCsv():
        """
        POST /api/dataset/upload

        Accepts a CSV file (multipart/form-data, field name "file").
        Creates a **new dataset version** without deleting previous data.

        Optional form fields:
            year  – data year (default: 2023)
            name  – dataset name (default: auto)
            description – dataset description

        The upload will:
          1. Validate CSV headers and every row.
          2. Create a new Dataset record (next version).
          3. Insert province rows linked to the new dataset.
          4. Mark the new dataset as active, deactivate previous.
        """
        # ─ Validate file presence ─────────────────────────────
        if "file" not in request.files:
            return errorResponse("Field 'file' wajib ada (multipart/form-data)", "FILE_FIELD_REQUIRED", 400)

        file = request.files["file"]
        if file.filename == "" or not file.filename.lower().endswith(".csv"):
            return errorResponse("File harus berformat CSV (.csv)", "INVALID_FILE_TYPE", 400)

        maxBytes = int(current_app.config.get("MAX_CONTENT_LENGTH", 10 * 1024 * 1024))
        if maxBytes < 1024 * 1024:
            maxBytes = 1024 * 1024

        if file.content_length is not None and file.content_length > maxBytes:
            return errorResponse("Ukuran file melebihi batas maksimum", "FILE_TOO_LARGE", 413)

        year = request.form.get("year", "2023")
        try:
            year = int(year)
        except ValueError:
            return errorResponse("Parameter 'year' harus berupa angka", "INVALID_YEAR", 400)

        name = request.form.get("name", "Investasi Per Provinsi Indonesia")
        description = request.form.get(
            "description",
            "Dataset investasi per provinsi di Indonesia mencakup indikator "
            "ekonomi, infrastruktur, dan pembangunan manusia untuk 34 provinsi.",
        )

        # ─ Parse CSV ──────────────────────────────────────────
        try:
            rawBytes = file.stream.read(maxBytes + 1)
            if len(rawBytes) > maxBytes:
                return errorResponse("Ukuran file melebihi batas maksimum", "FILE_TOO_LARGE", 413)
            stream = io.StringIO(rawBytes.decode("utf-8-sig"))
        except UnicodeDecodeError:
            return errorResponse("File tidak dapat dibaca (pastikan encoding UTF-8)", "CSV_DECODE_FAILED", 400)

        reader = csv.DictReader(stream)
        if reader.fieldnames is None:
            return errorResponse("CSV kosong atau tidak memiliki header", "CSV_EMPTY", 400)

        # Normalize headers (strip whitespace) and apply aliases
        headersRaw = [h.strip() for h in reader.fieldnames]
        headersMapped = [CSV_COLUMN_ALIASES.get(h, h) for h in headersRaw]
        headers = set(headersMapped)

        # Rebuild fieldnames so DictReader rows use canonical names
        reader.fieldnames = headersMapped

        missing = DatasetController.REQUIRED_COLUMNS - headers
        if missing:
            return errorResponse(
                f"Kolom wajib tidak ditemukan: {', '.join(sorted(missing))}",
                "CSV_REQUIRED_COLUMNS_MISSING",
                400,
                required=sorted(DatasetController.REQUIRED_COLUMNS),
                found=sorted(headers),
            )

        # ─ Validate rows ─────────────────────────────────────
        rows: list[dict] = []
        seenProvinces: set[str] = set()
        errors: list[str] = []

        for i, rawRow in enumerate(reader, start=2):  # row 1 = header
            row = {k.strip(): v.strip() if v else "" for k, v in rawRow.items()}

            provinsi = row.get("provinsi", "").strip()
            if not provinsi:
                errors.append(f"Baris {i}: kolom 'provinsi' kosong")
                continue

            if provinsi in seenProvinces:
                errors.append(f"Baris {i}: duplikat provinsi '{provinsi}'")
                continue
            seenProvinces.add(provinsi)

            parsed: dict = {"provinsi": provinsi, "year": year}
            for col in Province.NUMERIC_COLUMNS:
                valStr = row.get(col, "").strip()
                if not valStr:
                    errors.append(f"Baris {i}: kolom '{col}' kosong untuk {provinsi}")
                    continue
                try:
                    parsed[col] = float(valStr)
                except ValueError:
                    errors.append(
                        f"Baris {i}: nilai '{col}' bukan angka ('{valStr}') untuk {provinsi}"
                    )
            rows.append(parsed)

        if errors:
            return errorResponse(
                "Validasi CSV gagal",
                "CSV_VALIDATION_FAILED",
                422,
                details=errors[:20],
                detail=errors[:20],
                total_errors=len(errors),
            )

        if len(rows) == 0:
            return errorResponse("CSV tidak memiliki baris data", "CSV_NO_ROWS", 400)

        # ─ Duplicate check (checksum) ─────────────────────────
        checksum = Dataset.computeChecksum(rawBytes)
        existing = Dataset.query.filter_by(checksum=checksum).first()
        if existing:
            return errorResponse(
                (
                    f"File CSV identik sudah diupload sebelumnya "
                    f"(v{existing.version}, {existing.created_at.isoformat()})"
                ),
                "CSV_ALREADY_EXISTS",
                409,
                existing_version=existing.toDict(),
            )

        # ─ Persist (non-destructive) ──────────────────────────
        try:
            # Get uploader from JWT context (set by @token_required)
            currentUser = getattr(g, "current_user", None)
            uploaderId = currentUser.id if currentUser else None

            newVersion = Dataset.nextVersion()

            ds = Dataset(
                version=newVersion,
                name=name,
                description=description,
                year=year,
                is_active=False,  # will activate below
                uploaded_by=uploaderId,
                original_filename=file.filename,
                checksum=checksum,
                row_count=len(rows),
            )
            db.session.add(ds)
            db.session.flush()  # get ds.id

            for r in rows:
                db.session.add(Province(dataset_id=ds.id, **r))

            # Deactivate all previous, activate new
            Dataset.query.filter(Dataset.id != ds.id).update({"is_active": False})
            ds.is_active = True

            db.session.commit()
        except Exception:
            db.session.rollback()
            logger.exception("Failed to persist uploaded dataset")
            return errorResponse("Gagal menyimpan data", "DATASET_PERSIST_FAILED", 500)

        return jsonify(
            {
                "message": (
                    f"Berhasil mengupload {len(rows)} provinsi "
                    f"(v{newVersion}, tahun {year})"
                ),
                "dataset": ds.toDict(),
                "row_count": len(rows),
                "year": year,
                "version": newVersion,
                "columns": sorted(DatasetController.REQUIRED_COLUMNS),
            }
        ), 201
