from flask import Flask, render_template, request, redirect, url_for
import sqlite3

app = Flask(__name__)

# Configura la base de datos
def get_db_connection():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    return conn

# Crea la tabla de citas (solo una vez)
def create_table():
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS citas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            telefono TEXT NOT NULL,
            servicio TEXT NOT NULL,
            fecha TEXT NOT NULL,
            hora TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

create_table()  # Ejecuta al iniciar

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/agendar", methods=["POST"])
def agendar():
    if request.method == "POST":
        nombre = request.form["nombre"]
        telefono = request.form["telefono"]
        servicio = request.form["servicio"]
        fecha = request.form["fecha"]
        hora = request.form["hora"]

        conn = get_db_connection()
        conn.execute(
            "INSERT INTO citas (nombre, telefono, servicio, fecha, hora) VALUES (?, ?, ?, ?, ?)",
            (nombre, telefono, servicio, fecha, hora)
        )
        conn.commit()
        conn.close()

        return redirect(url_for("index"))

if __name__ == "__main__":
    app.run(debug=True)