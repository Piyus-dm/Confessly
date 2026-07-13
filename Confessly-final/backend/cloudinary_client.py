import re

import cloudinary
import cloudinary.uploader

from config import CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET

cloudinary.config(
    cloud_name=CLOUDINARY_CLOUD_NAME,
    api_key=CLOUDINARY_API_KEY,
    api_secret=CLOUDINARY_API_SECRET,
    secure=True,
)


def upload_image(file_storage, folder):
    result = cloudinary.uploader.upload(file_storage, folder=folder)
    return result['secure_url'], result['public_id']


def delete_image(secure_url):
    if not secure_url:
        return
    match = re.search(r'/upload/(?:v\d+/)?(.+)\.[a-zA-Z0-9]+$', secure_url)
    if not match:
        return
    try:
        cloudinary.uploader.destroy(match.group(1))
    except Exception:
        pass
