import os
from storage import s3_client, R2_BUCKET_NAME

def configure_cors():
    print(f"Setting CORS configuration for bucket: {R2_BUCKET_NAME}")
    allowed_origins = os.getenv("CORS_ALLOWED_ORIGINS").split(",")
    cors_configuration = {
        'CORSRules': [{
            'AllowedHeaders': ['*'],
            'AllowedMethods': ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
            'AllowedOrigins': allowed_origins,
            'ExposeHeaders': ['ETag'],
            'MaxAgeSeconds': 3000
        }]
    }
    
    try:
        s3_client.put_bucket_cors(
            Bucket=R2_BUCKET_NAME,
            CORSConfiguration=cors_configuration
        )
        print("Successfully updated CORS policy for R2!")
    except Exception as e:
        print(f"Error setting CORS policy: {e}")

if __name__ == "__main__":
    configure_cors()
