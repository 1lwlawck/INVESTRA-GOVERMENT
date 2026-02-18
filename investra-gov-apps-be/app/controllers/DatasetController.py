"""Dataset controller with versioning and non-destructive CSV upload."""

from __future__ import annotations

import csv
import io
import logging

from flask import current_app, g, jsonify, request

from app.Extensions import db
from app.models.Dataset import Dataset
from app.models.Province import Province
from app.utils.ApiResponse import errorResponse

COLUMNS = ["provinsi", *Province.NUMERIC_COLUMNS]

CSV_COLUMN_ALIASES: dict[str, str] = {
    "pdrb_perkapita": "pdrb_per_kapita",
    "pdrb": "pdrb_per_kapita",
    "listrik": "akses_listrik",
}

logger = logging.getLogger(__name__)


class DatasetController:
    REQUIRED_COLUMNS = {"provinsi", *Province.NUMERIC_COLUMNS}

    @staticmethod
    def getInfo():
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
        ds = Dataset.getActive()
        if ds is None:
            return errorResponse("Tidak ada dataset aktif", "NO_ACTIVE_DATASET", 404)

        page = request.args.get("page", 1, type=int)
        pageSize = request.args.get(
            "pageSize",
            request.args.get("page_size", 50, type=int),
            type=int,
        )
        page = max(page, 1)
        pageSize = min(max(pageSize, 1), 100)

        query = Province.query.filter_by(dataset_id=ds.id).order_by(Province.provinsi)
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
        ds = Dataset.getActive()
        if ds is None:
            return errorResponse("Tidak ada dataset aktif", "NO_ACTIVE_DATASET", 404)

        n = request.args.get("n", 5, type=int)

        query = Province.query.filter_by(dataset_id=ds.id).order_by(Province.provinsi)
        total = query.count()
        n = min(max(1, n), total) if total > 0 else 0
        provinces = query.limit(n).all() if n > 0 else []

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

    @staticmethod
    def listVersions():
        datasets = Dataset.query.order_by(Dataset.version.desc()).all()
        return jsonify({"versions": [ds.toDict() for ds in datasets], "total": len(datasets)})

    @staticmethod
    def getVersion(versionId: str):
        ds = Dataset.getByPublicId(versionId)
        if ds is None:
            return errorResponse("Dataset version tidak ditemukan", "DATASET_VERSION_NOT_FOUND", 404)

        provinces = (
            Province.query.filter_by(dataset_id=ds.id).order_by(Province.provinsi).all()
        )

        return jsonify(
            {
                **ds.toDict(),
                "column_count": len(COLUMNS),
                "columns": COLUMNS,
                "data": [p.toDict() for p in provinces],
            }
        )

    @staticmethod
    def activateVersion(versionId: str):
        target = Dataset.getByPublicId(versionId)
        if target is None:
            return errorResponse("Dataset version tidak ditemukan", "DATASET_VERSION_NOT_FOUND", 404)

        if target.is_active:
            return jsonify({"message": "Dataset sudah aktif", **target.toDict()})

        try:
            Dataset.query.filter_by(is_active=True).update({"is_active": False})
            target.is_active = True
            db.session.commit()
        except Exception:
            db.session.rollback()
            logger.exception("Failed to activate dataset version id=%s", versionId)
            return errorResponse("Gagal mengaktifkan dataset", "DATASET_ACTIVATION_FAILED", 500)

        return jsonify({"message": f"Dataset v{target.version} berhasil diaktifkan", **target.toDict()})

    @staticmethod
    def uploadCsv():
        if "file" not in request.files:
            return errorResponse("Field 'file' wajib ada (multipart/form-data)", "FILE_FIELD_REQUIRED", 400)

        file = request.files["file"]
        if file.filename == "" or not file.filename.lower().endswith(".csv"):
            return errorResponse("File harus berformat CSV (.csv)", "INVALID_FILE_TYPE", 400)

        maxBytes = int(current_app.config.get("MAX_CONTENT_LENGTH", 10 * 1024 * 1024))
        maxBytes = max(maxBytes, 1024 * 1024)

        if file.content_length is not None and file.content_length > maxBytes:
            return errorResponse("Ukuran file melebihi batas maksimum", "FILE_TOO_LARGE", 413)

        yearRaw = request.form.get("year", "2023")
        try:
            year = int(yearRaw)
        except ValueError:
            return errorResponse("Parameter 'year' harus berupa angka", "INVALID_YEAR", 400)

        name = request.form.get("name", "Investasi Per Provinsi Indonesia")
        description = request.form.get(
            "description",
            (
                "Dataset investasi per provinsi di Indonesia mencakup indikator ekonomi, "
                "infrastruktur, dan pembangunan manusia untuk 34 provinsi."
            ),
        )

        try:
            rawBytes = file.stream.read(maxBytes + 1)
            if len(rawBytes) > maxBytes:
                return errorResponse("Ukuran file melebihi batas maksimum", "FILE_TOO_LARGE", 413)
            stream = io.StringIO(rawBytes.decode("utf-8-sig"))
        except UnicodeDecodeError:
            return errorResponse(
                "File tidak dapat dibaca (pastikan encoding UTF-8)",
                "CSV_DECODE_FAILED",
                400,
            )

        reader = csv.DictReader(stream)
        if reader.fieldnames is None:
            return errorResponse("CSV kosong atau tidak memiliki header", "CSV_EMPTY", 400)

        headersRaw = [h.strip() for h in reader.fieldnames]
        headersMapped = [CSV_COLUMN_ALIASES.get(h, h) for h in headersRaw]
        headers = set(headersMapped)
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

        rows: list[dict] = []
        seenProvinces: set[str] = set()
        errors: list[str] = []

        for i, rawRow in enumerate(reader, start=2):
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

        checksum = Dataset.computeChecksum(rawBytes)
        existing = Dataset.query.filter_by(checksum=checksum).first()
        if existing:
            return errorResponse(
                (
                    "File CSV identik sudah diupload sebelumnya "
                    f"(v{existing.version}, {existing.created_at.isoformat()})"
                ),
                "CSV_ALREADY_EXISTS",
                409,
                existing_version=existing.toDict(),
            )

        try:
            currentUser = getattr(g, "current_user", None)
            uploaderId = currentUser.id if currentUser else None
            newVersion = Dataset.nextVersion()

            ds = Dataset(
                version=newVersion,
                name=name,
                description=description,
                year=year,
                is_active=False,
                uploaded_by=uploaderId,
                original_filename=file.filename,
                checksum=checksum,
                row_count=len(rows),
            )
            ds.ensurePublicIdentifiers()
            db.session.add(ds)
            db.session.flush()

            seq = Province.nextSequenceForYear(year)
            for offset, r in enumerate(rows):
                province = Province(
                    dataset_id=ds.id,
                    code=Province.buildCode(seq + offset, year),
                    **r,
                )
                province.ensurePublicIdentifiers()
                db.session.add(province)

            Dataset.query.filter(Dataset.id != ds.id).update({"is_active": False})
            ds.is_active = True

            db.session.commit()
        except Exception:
            db.session.rollback()
            logger.exception("Failed to persist uploaded dataset")
            return errorResponse("Gagal menyimpan data", "DATASET_PERSIST_FAILED", 500)

        return (
            jsonify(
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
            ),
            201,
        )

