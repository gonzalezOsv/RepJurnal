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
    
    # Privacy & Social Fields
    profile_visibility = db.Column(db.Enum('public', 'friends_only', 'private', name='profile_visibility_enum'), default='public')
    show_stats_to_friends = db.Column(db.Boolean, default=True)
    show_workouts_to_friends = db.Column(db.Boolean, default=True)
    show_routines_to_public = db.Column(db.Boolean, default=True)
    bio = db.Column(db.Text)
    profile_picture_url = db.Column(db.String(255))
    
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
    sets = db.Column(db.Integer, nullable=True)  # Nullable for cardio
    reps = db.Column(db.Integer, nullable=True)  # Nullable for cardio
    weight = db.Column(db.Float, nullable=True)  # Nullable for cardio
    date = db.Column(db.Date, nullable=False)
    # Cardio-specific fields
    duration_minutes = db.Column(db.Float, nullable=True)
    distance_miles = db.Column(db.Float, nullable=True)
    distance_km = db.Column(db.Float, nullable=True)
    intensity = db.Column(db.String(20), nullable=True)  # Low, Moderate, High
    calories_burned = db.Column(db.Integer, nullable=True)
    exercise_type = db.Column(db.Enum('strength', 'cardio', name='exercise_type'), default='strength', nullable=False)

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
        """Calculate the total weight lifted for a list of workouts (only strength exercises)"""
        if not workout_ids:
            return 0
        total_weight = db.session.query(func.sum(cls.weight)).filter(
            cls.workout_id.in_(workout_ids),
            cls.exercise_type == 'strength',
            cls.weight.isnot(None)
        ).scalar() or 0
        return total_weight

    @classmethod
    def get_total_reps(cls, workout_ids):
        """Calculate the total reps performed for a list of workouts (only strength exercises)"""
        if not workout_ids:
            return 0
        total_reps = db.session.query(func.sum(cls.reps)).filter(
            cls.workout_id.in_(workout_ids),
            cls.exercise_type == 'strength',
            cls.reps.isnot(None)
        ).scalar() or 0
        return total_reps
    
    @classmethod
    def get_volume_per_body_part_per_week(cls, user_id):
        start_of_week = datetime.now() - timedelta(days=datetime.now().weekday())
        end_of_week = start_of_week + timedelta(days=6)

        # Query to get the total volume per body part for the current week (only strength exercises)
        volume_per_body_part = db.session.query(
            BodyPart.body_part_name,
            func.sum(cls.sets * cls.reps * cls.weight).label('total_volume')
        ).join(
            BodyPart, BodyPart.body_part_id == cls.body_part_id
        ).filter(
            cls.user_id == user_id,
            cls.date >= start_of_week.date(),
            cls.date <= end_of_week.date(),
            cls.exercise_type == 'strength',  # Only count strength exercises
            cls.weight.isnot(None),  # Ensure weight is not NULL
            cls.reps.isnot(None),    # Ensure reps is not NULL
            cls.sets.isnot(None)     # Ensure sets is not NULL
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


# Workout Routine models
class WorkoutRoutine(db.Model):
    __tablename__ = 'WorkoutRoutines'
    routine_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('Users.user_id'), nullable=False)
    routine_name = db.Column(db.String(100), nullable=False)  # Keep as routine_name to match database
    description = db.Column(db.Text)
    share_token = db.Column(db.String(32), unique=True, nullable=True, index=True)  # For QR code sharing
    is_imported = db.Column(db.Boolean, default=False, nullable=False)  # Track if routine was imported
    imported_from_user_id = db.Column(db.Integer, db.ForeignKey('Users.user_id'), nullable=True)  # Original creator
    visibility = db.Column(db.Enum('public', 'friends_only', 'private', name='routine_visibility_enum'), default='private')
    is_deleted = db.Column(db.Boolean, default=False, nullable=False, index=True)  # Soft delete for imported routines
    deleted_at = db.Column(db.TIMESTAMP, nullable=True)  # When it was soft-deleted
    created_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp())
    updated_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    # Relationship to User (owner)
    user = db.relationship('User', backref=db.backref('workout_routines', lazy=True), foreign_keys=[user_id])
    
    # Relationship to original creator (for imported routines)
    imported_from_user = db.relationship('User', foreign_keys=[imported_from_user_id], lazy=True)
    
    # Relationship to RoutineExercises
    exercises = db.relationship('RoutineExercise', backref='routine', lazy=True, cascade='all, delete-orphan', order_by='RoutineExercise.exercise_order')


class RoutineExercise(db.Model):
    __tablename__ = 'RoutineExercises'
    routine_exercise_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    routine_id = db.Column(db.Integer, db.ForeignKey('WorkoutRoutines.routine_id', ondelete='CASCADE'), nullable=False)
    body_part_id = db.Column(db.Integer, db.ForeignKey('BodyParts.body_part_id'), nullable=False)
    exercise_name = db.Column(db.String(100), nullable=False)
    sets = db.Column(db.Integer, nullable=True)
    reps = db.Column(db.Integer, nullable=True)
    weight = db.Column(db.Float, nullable=True)  # Target weight (optional)
    unit = db.Column(db.String(10), default='lb')  # 'lb' or 'kg'
    exercise_order = db.Column(db.Integer, nullable=False, default=0)  # For ordering exercises
    exercise_type = db.Column(db.Enum('strength', 'cardio'), default='strength')
    
    # Cardio fields (optional)
    duration_minutes = db.Column(db.Float, nullable=True)
    distance_miles = db.Column(db.Float, nullable=True)
    distance_km = db.Column(db.Float, nullable=True)
    intensity = db.Column(db.String(20), nullable=True)
    
    # Relationship to BodyPart
    body_part = db.relationship('BodyPart', backref='routine_exercises', lazy=True)


# Routine Session model - Track when users start/finish routines for analytics
class RoutineSession(db.Model):
    __tablename__ = 'RoutineSessions'
    session_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('Users.user_id', ondelete='CASCADE'), nullable=False)
    routine_id = db.Column(db.Integer, db.ForeignKey('WorkoutRoutines.routine_id', ondelete='CASCADE'), nullable=False)
    
    # Session timing
    started_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp(), nullable=False)
    completed_at = db.Column(db.TIMESTAMP, nullable=True)  # NULL if not finished
    
    # Completion tracking
    total_exercises = db.Column(db.Integer, nullable=False)  # Total exercises in routine
    completed_exercises = db.Column(db.Integer, default=0)  # Exercises user completed
    is_fully_completed = db.Column(db.Boolean, default=False)  # True if all exercises done
    completion_percentage = db.Column(db.Float, default=0.0)  # Percentage completed
    
    # Session metadata
    workout_date = db.Column(db.Date, nullable=False)  # Date of the workout
    duration_minutes = db.Column(db.Float, nullable=True)  # Time from start to finish
    
    # Relationships
    user = db.relationship('User', backref='routine_sessions', lazy=True)
    routine = db.relationship('WorkoutRoutine', backref='sessions', lazy=True)


# Friend Request model
class FriendRequest(db.Model):
    __tablename__ = 'FriendRequests'
    request_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('Users.user_id', ondelete='CASCADE'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('Users.user_id', ondelete='CASCADE'), nullable=False)
    status = db.Column(db.Enum('pending', 'accepted', 'declined', name='friend_request_status_enum'), default='pending')
    message = db.Column(db.Text)
    created_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp())
    updated_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    
    # Relationships
    sender = db.relationship('User', foreign_keys=[sender_id], backref=db.backref('sent_friend_requests', lazy=True))
    receiver = db.relationship('User', foreign_keys=[receiver_id], backref=db.backref('received_friend_requests', lazy=True))
    
    def to_dict(self):
        return {
            'request_id': self.request_id,
            'sender_id': self.sender_id,
            'sender_username': self.sender.username,
            'sender_first_name': self.sender.first_name,
            'sender_last_name': self.sender.last_name,
            'receiver_id': self.receiver_id,
            'receiver_username': self.receiver.username,
            'status': self.status,
            'message': self.message,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# Friend model
class Friend(db.Model):
    __tablename__ = 'Friends'
    friendship_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('Users.user_id', ondelete='CASCADE'), nullable=False)
    friend_id = db.Column(db.Integer, db.ForeignKey('Users.user_id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp())
    
    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref=db.backref('friendships', lazy=True))
    friend = db.relationship('User', foreign_keys=[friend_id])
    
    def to_dict(self):
        return {
            'friendship_id': self.friendship_id,
            'user_id': self.user_id,
            'friend_id': self.friend_id,
            'friend_username': self.friend.username,
            'friend_first_name': self.friend.first_name,
            'friend_last_name': self.friend.last_name,
            'friend_profile_visibility': self.friend.profile_visibility,
            'friend_bio': self.friend.bio,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# Tracked Exercise model - User's custom tracked exercises for Main Lifts tab
class TrackedExercise(db.Model):
    __tablename__ = 'TrackedExercises'
    tracked_exercise_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('Users.user_id', ondelete='CASCADE'), nullable=False)
    exercise_name = db.Column(db.String(100), nullable=False)
    display_order = db.Column(db.Integer, default=0)  # For ordering on the dashboard
    created_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp())
    
    # Relationships
    user = db.relationship('User', backref=db.backref('tracked_exercises', lazy=True))
    
    # Unique constraint: each user can only track an exercise once
    __table_args__ = (
        db.UniqueConstraint('user_id', 'exercise_name', name='unique_user_exercise'),
    )
    
    def to_dict(self):
        return {
            'tracked_exercise_id': self.tracked_exercise_id,
            'user_id': self.user_id,
            'exercise_name': self.exercise_name,
            'display_order': self.display_order,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
     