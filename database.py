import psycopg2
from psycopg2 import pool
from flask import current_app
import os

connection_pool = None

def init_db(app):
    global connection_pool
    connection_pool = psycopg2.pool.SimpleConnectionPool(
        minconn=1,
        maxconn=10,
        dsn=app.config['DATABASE_URL']
    )

def get_db_connection():
    if not connection_pool:
        raise Exception("Connection pool not initialized")
    return connection_pool.getconn()

def close_db_connection(conn):
    if connection_pool and conn:
        connection_pool.putconn(conn)

def create_tables():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS servicios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                duracion INTEGER NOT NULL,
                precio DECIMAL(10,2) NOT NULL
            )
        """)
        
        cur.execute("""
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                telefono VARCHAR(20)
            )
        """)
        
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
        cur.close()
    except Exception as e:
        print(f"Error creating tables: {e}")
    finally:
        if conn:
            close_db_connection(conn)