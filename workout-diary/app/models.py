from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from datetime import datetime, timedelta
from sqlalchemy import func

db = SQLAlchemy()

class User(db.Model, UserMixin):
    __tablename__ = 'Users'
    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    date_of_birth = db.Column(db.Date)
    gender = db.Column(db.Enum('Male', 'Female', 'Other'))
    phone_number = db.Column(db.String(20))
    address = db.Column(db.String(255))
    created_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp())
    updated_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    # New Fields for Fitness & Lifestyle
    height_cm = db.Column(db.Float)  # Height in cm
    weight_kg = db.Column(db.Float)  # Weight in kg
    body_fat_percentage = db.Column(db.Float)
    fitness_goal = db.Column(db.Enum('Weight Loss', 'Muscle Gain', 'Maintenance', 'Improved Endurance', name='fitness_goal_enum'))
    activity_level = db.Column(db.Enum('Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active', 'Super Active', name='activity_level_enum'))
    dietary_preferences = db.Column(db.String(255))  # E.g., "Vegan", "Low Carb", etc.
    preferred_workout_time = db.Column(db.Time)  # Preferred time for workouts (e.g., '06:00:00')
    
    def get_id(self):
        # Return the user_id for Flask-Login
        return str(self.user_id)

    def set_user_id(self, user_id):
        self.user_id = user_id

    def set_username(self, username):
        self.username = username

    def set_email(self, email):
        self.email = email

    def set_password(self, password):
        """Set password as a hashed value"""
        self.password_hash = generate_password_hash(password)

    def set_first_name(self, first_name):
        self.first_name = first_name

    def set_last_name(self, last_name):
        self.last_name = last_name

    def set_date_of_birth(self, date_of_birth):
        self.date_of_birth = date_of_birth

    def set_gender(self, gender):
        self.gender = gender

    def set_phone_number(self, phone_number):
        self.phone_number = phone_number

    def set_address(self, address):
        self.address = address

    def set_created_at(self, created_at):
        self.created_at = created_at

    def set_updated_at(self, updated_at):
        self.updated_at = updated_at
    
    # New setters for the new fields
    def set_height_cm(self, height_cm):
        self.height_cm = height_cm
    
    def set_weight_kg(self, weight_kg):
        self.weight_kg = weight_kg

    def set_fitness_goal(self, fitness_goal):
        self.fitness_goal = fitness_goal

    def set_dietary_preferences(self, dietary_preferences):
        self.dietary_preferences = dietary_preferences

    def set_preferred_workout_time(self, preferred_workout_time):
        self.preferred_workout_time = preferred_workout_time

    # Getters for the new fields
    def get_height_cm(self):
        return self.height_cm

    def get_weight_kg(self):
        return self.weight_kg

    def get_fitness_goal(self):
        return self.fitness_goal

    def get_dietary_preferences(self):
        return self.dietary_preferences

    def get_preferred_workout_time(self):
        return self.preferred_workout_time

    # Getters and setters for existing fields...
    def get_user_id(self):
        return self.user_id

    def get_username(self):
        return self.username

    def get_email(self):
        return self.email

    def check_password(self, password):
        """Check if the given password matches the stored hash"""
        return check_password_hash(self.password_hash, password)

    def get_first_name(self):
        return self.first_name

    def get_last_name(self):
        return self.last_name

    def get_date_of_birth(self):
        return self.date_of_birth

    def get_gender(self):
        return self.gender

    def get_phone_number(self):
        return self.phone_number

    def get_address(self):
        return self.address

    def get_created_at(self):
        return self.created_at

    def get_updated_at(self):
        return self.updated_at


# Define the Workout model
class Workout(db.Model):
    __tablename__ = 'Workouts'
    workout_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('Users.user_id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    workout_name = db.Column(db.String(50), nullable=False)
    notes = db.Column(db.Text)

    # Relationship to User
    user = db.relationship('User', backref=db.backref('workouts', lazy=True))

    # Relationship to Exercises
    exercises = db.relationship('Exercise', backref='workout', lazy=True)

    @classmethod
    def get_workouts_this_week(cls, user_id):
        """Return workouts for a given user this week"""
        start_of_week = datetime.now() - timedelta(days=datetime.now().weekday())
        return cls.query.filter(
            cls.user_id == user_id,
            cls.date >= start_of_week.date()
        ).all()
    
    @classmethod
    def get_workouts_for_date(cls, user_id, date):
        """Return workouts for a given user on a specific date"""
        return cls.query.filter(
            cls.user_id == user_id,
            cls.date == date.date()
        ).all()
    
    @classmethod
    def calculate_consecutive_workout_days(cls, user_id):
        """Calculate the current workout streak (consecutive days with workouts)"""
        from datetime import date, timedelta
        
        # Get all workout dates for the user, ordered by date descending
        workouts = cls.query.filter(
            cls.user_id == user_id
        ).order_by(cls.date.desc()).all()
        
        if not workouts:
            return 0
        
        # Get unique dates (in case multiple workouts on same day)
        workout_dates = sorted(set(w.date for w in workouts), reverse=True)
        
        # Check if the most recent workout was today or yesterday
        today = date.today()
        if workout_dates[0] > today:
            # Future workout logged, start from there
            current_date = workout_dates[0]
        elif workout_dates[0] == today or workout_dates[0] == today - timedelta(days=1):
            # Streak is active
            current_date = today
        else:
            # Streak is broken (no workout today or yesterday)
            return 0
        
        # Count consecutive days
        streak = 0
        for workout_date in workout_dates:
            if workout_date == current_date or workout_date == current_date - timedelta(days=1):
                streak += 1
                current_date = workout_date - timedelta(days=1)
            else:
                # Gap in streak
                break
        
        return streak




# Define the CustomExercise model
class CustomExercise(db.Model):
    __tablename__ = 'CustomExercises'
    custom_exercise_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('Users.user_id'), nullable=False)
    body_part_id = db.Column(db.Integer, db.ForeignKey('BodyParts.body_part_id'), nullable=False)
    exercise_name = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp())

    # Relationship to User
    user = db.relationship('User', backref=db.backref('custom_exercises', lazy=True))

    # Relationship to Exercises
    exercises = db.relationship('Exercise', backref='custom_exercise', lazy=True)


# Define the Exercise model
class Exercise(db.Model):
    __tablename__ = 'Exercises'
    exercise_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    workout_id = db.Column(db.Integer, db.ForeignKey('Workouts.workout_id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('Users.user_id'), nullable=False)
    body_part_id = db.Column(db.Integer, db.ForeignKey('BodyParts.body_part_id'))
    standard_exercise_id = db.Column(db.Integer, db.ForeignKey('StandardExercises.standard_exercise_id'), nullable=True)
    custom_exercise_id = db.Column(db.Integer, db.ForeignKey('CustomExercises.custom_exercise_id'), nullable=True)
    exercise_name = db.Column(db.String(50), nullable=True)  # Keep for backward compatibility
    sets = db.Column(db.Integer, nullable=False)
    reps = db.Column(db.Integer, nullable=False)
    weight = db.Column(db.Float, nullable=False)
    date = db.Column(db.Date, nullable=False)

    # Helper method to get the exercise name dynamically
    def get_exercise_name(self):
        if self.standard_exercise_id:
            return self.standard_exercise.exercise_name  # From StandardExercise
        elif self.custom_exercise_id:
            return self.custom_exercise.exercise_name  # From CustomExercise
        return self.exercise_name or "Unknown"  # Fallback for legacy data

    # Keep existing class methods
    @classmethod
    def get_total_weight_lifted(cls, workout_ids):
        """Calculate the total weight lifted for a list of workouts"""
        total_weight = db.session.query(func.sum(cls.weight)).filter(
            cls.workout_id.in_(workout_ids)
        ).scalar() or 0
        return total_weight

    @classmethod
    def get_total_reps(cls, workout_ids):
        """Calculate the total reps performed for a list of workouts"""
        total_reps = db.session.query(func.sum(cls.reps)).filter(
            cls.workout_id.in_(workout_ids)
        ).scalar() or 0
        return total_reps
    
    @classmethod
    def get_volume_per_body_part_per_week(cls, user_id):
        start_of_week = datetime.now() - timedelta(days=datetime.now().weekday())
        end_of_week = start_of_week + timedelta(days=6)

        # Query to get the total volume per body part for the current week
        volume_per_body_part = db.session.query(
            BodyPart.body_part_name,
            func.sum(cls.sets * cls.reps * cls.weight).label('total_volume')
        ).join(
            BodyPart, BodyPart.body_part_id == cls.body_part_id
        ).filter(
            cls.user_id == user_id,
            cls.date >= start_of_week.date(),
            cls.date <= end_of_week.date()
        ).group_by(
            BodyPart.body_part_name
        ).all()

        return volume_per_body_part



#new models, 

# Define the BodyPart model
class BodyPart(db.Model):
    __tablename__ = 'BodyParts'
    body_part_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    body_part_name = db.Column(db.String(50), unique=True, nullable=False)

    # Updated relationships to include standard_exercises
    custom_exercises = db.relationship('CustomExercise', backref='body_part', lazy=True)
    standard_exercises = db.relationship('StandardExercise', backref='body_part', lazy=True)
    exercises = db.relationship('Exercise', backref='body_part', lazy=True)


class StandardExercise(db.Model):
    __tablename__ = 'StandardExercises'
    
    standard_exercise_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    body_part_id = db.Column(db.Integer, db.ForeignKey('BodyParts.body_part_id'), nullable=False)
    exercise_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    is_compound = db.Column(db.Boolean, default=False)
    
    # Define relationship to Exercise with explicit foreign keys
    exercises = db.relationship('Exercise', 
                              backref=db.backref('standard_exercise', lazy=True),
                              foreign_keys='Exercise.standard_exercise_id',
                              lazy=True)





class LegalDocument(db.Model):
    __tablename__ = 'legal_documents'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    document_type = db.Column(db.String(50), nullable=False)
    version = db.Column(db.String(20), nullable=False)
    content = db.Column(db.Text, nullable=False)
    active = db.Column(db.Boolean, default=True)
    effective_date = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.now())
    created_by = db.Column(db.String(100))

    def __repr__(self):
        return f"<LegalDocument {self.document_type} v{self.version}>"


class MotivationalQuote(db.Model):
    __tablename__ = 'motivational_quotes'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    quote_text = db.Column(db.Text, nullable=False)
    author = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50))  # e.g., 'motivation', 'strength', 'perseverance'
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=db.func.now())

    def __repr__(self):
        return f"<MotivationalQuote by {self.author}>"
    
    @staticmethod
    def get_random_quote():
        """Get a random active quote"""
        import random
        quotes = MotivationalQuote.query.filter_by(active=True).all()
        return random.choice(quotes) if quotes else None
    