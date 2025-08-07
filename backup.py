import os
import boto3
from datetime import datetime
from app import app

def hacer_backup():
    with app.app_context():
        # Configuración
        DB_URL = app.config['SQLALCHEMY_DATABASE_URI']
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = f"backup_{timestamp}.sql"
        
        # 1. Ejecutar pg_dump
        os.system(f"pg_dump {DB_URL} > {backup_file}")
        
        # 2. Subir a AWS S3 (gratis por 12 meses)
        s3 = boto3.client(
            's3',
            aws_access_key_id=os.environ.get('AWS_KEY'),
            aws_secret_access_key=os.environ.get('AWS_SECRET')
        )
        s3.upload_file(
            backup_file,
            'backups-barberia',  # Nombre de tu bucket
            f"backups/{backup_file}"
        )
        
        # 3. Eliminar archivo local
        os.remove(backup_file)
        return f"Backup {backup_file} completado"

if __name__ == '__main__':
    hacer_backup()