import os
from flask import Flask, render_template, request, redirect, url_for, session, flash
from datetime import datetime
import psycopg2
from psycopg2 import pool
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

def create_app():
    app = Flask(__name__)
    app.secret_key = os.getenv('SECRET_KEY', 'default-secret-key')

    # Configuración
    app.config['ADMIN_USER'] = os.getenv('ADMIN_USER', 'admin_pro')
    app.config['ADMIN_PASS'] = os.getenv('ADMIN_PASS', 'Cl4v3-S3gur4!')
    
    # Pool de conexiones mejorado
    connection_pool = None

    def init_db():
        nonlocal connection_pool
        try:
            # Intenta conectar usando DATABASE_URL primero
            db_url = os.getenv('DATABASE_URL')
            if not db_url:
                # Si no hay DATABASE_URL, construye la URL desde las variables individuales
                db_url = f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{
                    os.getenv('DB_HOST')}:{os.getenv('DB_PORT', '5432')}/{os.getenv('DB_NAME')}"
                
            connection_pool = psycopg2.pool.SimpleConnectionPool(
                minconn=1,
                maxconn=10,
                dsn=db_url
            )
            
            # Prueba la conexión
            conn = connection_pool.getconn()
            conn.cursor().execute("SELECT 1")
            connection_pool.putconn(conn)
            
            print("✅ Conexión a la base de datos establecida correctamente")
            return True
            
        except Exception as e:
            print(f"❌ Error al conectar a la base de datos: {e}")
            connection_pool = None
            return False

    def get_db_connection():
        if not connection_pool and not init_db():
            return None
            
        try:
            return connection_pool.getconn()
        except:
            return None

    def close_db_connection(conn):
        if connection_pool and conn:
            try:
                connection_pool.putconn(conn)
            except:
                pass

    # [El resto de tu código permanece igual...]
    # ... tus rutas y demás funciones aquí ...

    return app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
