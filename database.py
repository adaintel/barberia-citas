import psycopg2
from psycopg2 import pool
from flask import current_app

def create_tables():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Tabla de servicios
        cur.execute("""
            CREATE TABLE IF NOT EXISTS servicios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                duracion INTEGER NOT NULL,
                precio DECIMAL(10,2) NOT NULL
            )
        """)
        
        # Tabla de usuarios
        cur.execute("""
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                telefono VARCHAR(20)
            )
        """)
        
        # Tabla de citas
        cur.execute("""
            CREATE TABLE IF NOT EXISTS citas (
                id SERIAL PRIMARY KEY,
                fecha DATE NOT NULL,
                hora TIME NOT NULL,
                cliente_id INTEGER REFERENCES usuarios(id),
                servicio_id INTEGER REFERENCES servicios(id),
                estado VARCHAR(20) DEFAULT 'pendiente'
            )
        """)
        
        conn.commit()
        print("Tablas creadas exitosamente")
        
    except Exception as e:
        print(f"Error al crear tablas: {e}")
    finally:
        if conn:
            close_db_connection(conn)
