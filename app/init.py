from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from config import Config

db = SQLAlchemy()
migrate = Migrate()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    db.init_app(app)
    migrate.init_app(app, db)
    
    # Registrar blueprints
    from app.routes import main_routes, auth_routes, cita_routes, admin_routes
    app.register_blueprint(main_routes)
    app.register_blueprint(auth_routes, url_prefix='/auth')
    app.register_blueprint(cita_routes, url_prefix='/citas')
    app.register_blueprint(admin_routes, url_prefix='/admin')
    
    return app
