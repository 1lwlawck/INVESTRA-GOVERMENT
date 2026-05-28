"""Dataset controller with versioning and non-destructive CSV upload."""

from __future__ import annotations

import csv
import io
import logging
from typing import ClassVar

from flask import current_app, g, jsonify, request

from app.extensions import db
from app.models.dataset import Dataset
from app.models.province import Province
from app.utils.api_response import error_response

COLUMNS = ["provinsi", "year", *Province.NUMERIC_COLUMNS]

CSV_COLUMN_ALIASES: dict[str, str] = {
    "pdrb_perkapita": "pdrb_per_kapita",
    "pdrb": "pdrb_per_kapita",
    "listrik": "akses_listrik",
    "tahun": "year",
}

logger = logging.getLogger(__name__)


class DatasetController:
    REQUIRED_COLUMNS: ClassVar[set[str]] = {"provinsi", *Province.NUMERIC_COLUMNS}

def get_info():
    ds = Dataset.get_active()
    if ds is None:
        return error_response("Tidak ada dataset aktif", "NO_ACTIVE_DATASET", 404)

    return jsonify(
        {
            **ds.to_dict(),
            "column_count": len(COLUMNS),
            "columns": COLUMNS,
        }
    )

def get_data():
    ds = Dataset.get_active()
    if ds is None:
        return error_response("Tidak ada dataset aktif", "NO_ACTIVE_DATASET", 404)

    page = request.args.get("page", 1, type=int)
    page_size = request.args.get(
        "pageSize",
        request.args.get("page_size", 50, type=int),
        type=int,
    )
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)

    query = (
        Province.query
        .filter_by(dataset_id=ds.id)
        .order_by(Province.year.desc(), Province.provinsi)
    )
    total = query.count()
    provinces = query.offset((page - 1) * page_size).limit(page_size).all()

    return jsonify(
        {
            "data": [p.to_dict() for p in provinces],
            "columns": COLUMNS,
            "total_rows": total,
            "page": page,
            "page_size": page_size,
            "total_pages": max(1, -(-total // page_size)),
        }
    )

def get_sample():
    ds = Dataset.get_active()
    if ds is None:
        return error_response("Tidak ada dataset aktif", "NO_ACTIVE_DATASET", 404)

    n = request.args.get("n", 5, type=int)

    query = (
        Province.query
        .filter_by(dataset_id=ds.id)
        .order_by(Province.year.desc(), Province.provinsi)
    )
    total = query.count()
    n = min(max(1, n), total) if total > 0 else 0
    provinces = query.limit(n).all() if n > 0 else []

    return jsonify(
        {
            "data": [p.to_dict() for p in provinces],
            "columns": COLUMNS,
            "total_rows": total,
            "page": 1,
            "page_size": n,
            "total_pages": 1,
        }
    )

def list_versions():
    datasets = Dataset.query.order_by(Dataset.version.desc()).all()
    return jsonify({"versions": [ds.to_dict() for ds in datasets], "total": len(datasets)})

def get_version(version_id: str):
    ds = Dataset.get_by_public_id(version_id)
    if ds is None:
        return error_response("Dataset version tidak ditemukan", "DATASET_VERSION_NOT_FOUND", 404)

    provinces = (
        Province.query
        .filter_by(dataset_id=ds.id)
        .order_by(Province.year.desc(), Province.provinsi)
        .all()
    )

    return jsonify(
        {
            **ds.to_dict(),
            "column_count": len(COLUMNS),
            "columns": COLUMNS,
            "data": [p.to_dict() for p in provinces],
        }
    )

def activate_version(version_id: str):
    target = Dataset.get_by_public_id(version_id)
    if target is None:
        return error_response("Dataset version tidak ditemukan", "DATASET_VERSION_NOT_FOUND", 404)

    if target.is_active:
        return jsonify({"message": "Dataset sudah aktif", **target.to_dict()})

    try:
        Dataset.query.filter_by(is_active=True).update({"is_active": False})
        target.is_active = True
        db.session.commit()
    except Exception:
        db.session.rollback()
        logger.exception("Failed to activate dataset version id=%s", version_id)
        return error_response("Gagal mengaktifkan dataset", "DATASET_ACTIVATION_FAILED", 500)

    return jsonify({"message": f"Dataset v{target.version} berhasil diaktifkan", **target.to_dict()})

def upload_csv():
    if "file" not in request.files:
        return error_response("Field 'file' wajib ada (multipart/form-data)", "FILE_FIELD_REQUIRED", 400)

    file = request.files["file"]
    if file.filename == "" or not file.filename.lower().endswith(".csv"):
        return error_response("File harus berformat CSV (.csv)", "INVALID_FILE_TYPE", 400)

    max_bytes = int(current_app.config.get("MAX_CONTENT_LENGTH", 10 * 1024 * 1024))
    max_bytes = max(max_bytes, 1024 * 1024)

    if file.content_length is not None and file.content_length > max_bytes:
        return error_response("Ukuran file melebihi batas maksimum", "FILE_TOO_LARGE", 413)

    year_raw = request.form.get("year", "2023")
    try:
        default_year = int(year_raw)
    except ValueError:
        return error_response("Parameter 'year' harus berupa angka", "INVALID_YEAR", 400)
    if default_year < 1900 or default_year > 2100:
        return error_response(
            "Parameter 'year' harus di rentang 1900-2100",
            "INVALID_YEAR",
            400,
        )

    name = request.form.get("name", "Investasi Per Provinsi Indonesia")
    description = request.form.get(
        "description",
        (
            "Dataset investasi per provinsi di Indonesia mencakup indikator ekonomi, "
            "infrastruktur, dan pembangunan manusia untuk 34 provinsi."
        ),
    )

    try:
        raw_bytes = file.stream.read(max_bytes + 1)
        if len(raw_bytes) > max_bytes:
            return error_response("Ukuran file melebihi batas maksimum", "FILE_TOO_LARGE", 413)
        stream = io.StringIO(raw_bytes.decode("utf-8-sig"))
    except UnicodeDecodeError:
        return error_response(
            "File tidak dapat dibaca (pastikan encoding UTF-8)",
            "CSV_DECODE_FAILED",
            400,
        )

    reader = csv.DictReader(stream)
    if reader.fieldnames is None:
        return error_response("CSV kosong atau tidak memiliki header", "CSV_EMPTY", 400)

    headers_raw = [h.strip() for h in reader.fieldnames]
    headers_mapped = [CSV_COLUMN_ALIASES.get(h, h) for h in headers_raw]
    headers = set(headers_mapped)
    reader.fieldnames = headers_mapped
    has_year_column = "year" in headers

    missing = DatasetController.REQUIRED_COLUMNS - headers
    if missing:
        return error_response(
            f"Kolom wajib tidak ditemukan: {', '.join(sorted(missing))}",
            "CSV_REQUIRED_COLUMNS_MISSING",
            400,
            required=sorted(DatasetController.REQUIRED_COLUMNS),
            found=sorted(headers),
        )

    rows: list[dict] = []
    seen_province_years: set[tuple[str, int]] = set()
    seen_provinces: set[str] = set()
    errors: list[str] = []
    years_seen: set[int] = set()

    for i, raw_row in enumerate(reader, start=2):
        row = {k.strip(): v.strip() if v else "" for k, v in raw_row.items()}

        provinsi = row.get("provinsi", "").strip()
        if not provinsi:
            errors.append(f"Baris {i}: kolom 'provinsi' kosong")
            continue

        if has_year_column:
            year_str = row.get("year", "").strip()
            if not year_str:
                errors.append(
                    f"Baris {i}: kolom 'year' kosong untuk {provinsi}"
                )
                continue
            try:
                row_year = int(year_str)
            except ValueError:
                errors.append(
                    f"Baris {i}: nilai 'year' bukan angka ('{year_str}') untuk {provinsi}"
                )
                continue
        else:
            row_year = default_year

        if row_year < 1900 or row_year > 2100:
            errors.append(
                f"Baris {i}: nilai 'year' di luar rentang 1900-2100 ({row_year}) untuk {provinsi}"
            )
            continue

        key = (provinsi, row_year)
        if key in seen_province_years:
            errors.append(
                f"Baris {i}: duplikat provinsi-year '{provinsi}' ({row_year})"
            )
            continue
        seen_province_years.add(key)
        seen_provinces.add(provinsi)
        years_seen.add(row_year)

        parsed: dict = {"provinsi": provinsi, "year": row_year}
        for col in Province.NUMERIC_COLUMNS:
            val_str = row.get(col, "").strip()
            if not val_str:
                errors.append(f"Baris {i}: kolom '{col}' kosong untuk {provinsi}")
                continue
            try:
                parsed[col] = float(val_str)
            except ValueError:
                errors.append(
                    f"Baris {i}: nilai '{col}' bukan angka ('{val_str}') untuk {provinsi}"
                )
        rows.append(parsed)

    if errors:
        return error_response(
            "Validasi CSV gagal",
            "CSV_VALIDATION_FAILED",
            422,
            details=errors[:20],
            detail=errors[:20],
            total_errors=len(errors),
        )

    if len(rows) == 0:
        return error_response("CSV tidak memiliki baris data", "CSV_NO_ROWS", 400)

    min_year = min(years_seen)
    max_year = max(years_seen)
    unique_province_count = len(seen_provinces)

    checksum = Dataset.compute_checksum(raw_bytes)
    existing = Dataset.query.filter_by(checksum=checksum).first()
    if existing:
        return error_response(
            (
                "File CSV identik sudah diupload sebelumnya "
                f"(v{existing.version}, {existing.created_at.isoformat()})"
            ),
            "CSV_ALREADY_EXISTS",
            409,
            existing_version=existing.to_dict(),
        )

    try:
        current_user = getattr(g, "current_user", None)
        uploader_id = current_user.id if current_user else None
        new_version = Dataset.next_version()

        ds = Dataset(
            version=new_version,
            name=name,
            description=description,
            year=max_year,
            is_active=False,
            uploaded_by=uploader_id,
            original_filename=file.filename,
            checksum=checksum,
            row_count=unique_province_count,
        )
        ds.ensure_public_identifiers()
        db.session.add(ds)
        db.session.flush()

        year_seq_cursor = {
            y: Province.next_sequence_for_year(y) for y in sorted(years_seen)
        }
        for r in rows:
            row_year = int(r["year"])
            seq = year_seq_cursor[row_year]
            year_seq_cursor[row_year] = seq + 1
            province = Province(
                dataset_id=ds.id,
                code=Province.build_code(seq, row_year),
                **r,
            )
            province.ensure_public_identifiers()
            db.session.add(province)

        Dataset.query.filter(Dataset.id != ds.id).update({"is_active": False})
        ds.is_active = True

        db.session.commit()
    except Exception:
        db.session.rollback()
        logger.exception("Failed to persist uploaded dataset")
        return error_response("Gagal menyimpan data", "DATASET_PERSIST_FAILED", 500)

    return (
        jsonify(
            {
                "message": (
                    f"Berhasil mengupload {len(rows)} baris "
                    f"({unique_province_count} provinsi, v{new_version}, periode {min_year}-{max_year})"
                ),
                "dataset": ds.to_dict(),
                "record_count": len(rows),
                "row_count": unique_province_count,
                "year": max_year,
                "year_range": {"min": min_year, "max": max_year},
                "version": new_version,
                "columns": sorted(DatasetController.REQUIRED_COLUMNS | {"year"}),
            }
        ),
        201,
    )
