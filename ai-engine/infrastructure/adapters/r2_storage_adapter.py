import uuid

import boto3

from domain.ports.image_storage_port import ImageStoragePort


class R2StorageAdapter(ImageStoragePort):
    """Cloudflare R2 implementation ของ ImageStoragePort"""

    def __init__(self, bucket: str, access_key: str, secret_key: str, endpoint: str, base_url: str):
        self.bucket = bucket
        self.base_url = base_url.rstrip("/")
        self.s3 = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name="auto",
        )

    async def upload(self, image_bytes: bytes, filename: str, alt_text: str = "") -> str:
        # สร้าง unique key เพื่อไม่ให้ชื่อซ้ำ
        ext = filename.rsplit(".", 1)[-1] if "." in filename else "webp"
        key = f"images/{uuid.uuid4().hex}.{ext}"

        content_type = "image/webp" if ext == "webp" else f"image/{ext}"

        self.s3.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=image_bytes,
            ContentType=content_type,
        )

        return f"{self.base_url}/{key}"

    async def delete(self, image_url: str) -> bool:
        try:
            # แปลง URL กลับเป็น key
            key = image_url.replace(f"{self.base_url}/", "")
            self.s3.delete_object(Bucket=self.bucket, Key=key)
            return True
        except Exception:
            return False
