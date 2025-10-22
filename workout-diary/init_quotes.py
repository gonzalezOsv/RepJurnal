#!/usr/bin/env python3
"""
Initialize the motivational_quotes table and populate it with quotes.
Run this script to set up the quotes feature for the dashboard.
"""

from app.app import create_app
from app.models import db, MotivationalQuote

def init_quotes():
    """Create the motivational_quotes table and add initial quotes."""
    app = create_app()
    
    with app.app_context():
        print("🔨 Creating motivational_quotes table...")
        
        # Create the table
        db.create_all()
        
        # Check if quotes already exist
        existing_quotes = MotivationalQuote.query.count()
        if existing_quotes > 0:
            print(f"✅ Table already exists with {existing_quotes} quotes!")
            return
        
        print("📝 Adding motivational quotes...")
        
        # List of quotes to add
        quotes = [
            {
                'quote_text': "The only bad workout is the one that didn't happen.",
                'author': 'Unknown',
                'category': 'motivation'
            },
            {
                'quote_text': "Success isn't always about greatness. It's about consistency. Consistent hard work leads to success.",
                'author': 'Dwayne Johnson',
                'category': 'consistency'
            },
            {
                'quote_text': 'The body achieves what the mind believes.',
                'author': 'Napoleon Hill',
                'category': 'mindset'
            },
            {
                'quote_text': 'The pain you feel today will be the strength you feel tomorrow.',
                'author': 'Unknown',
                'category': 'strength'
            },
            {
                'quote_text': "Don't count the days, make the days count.",
                'author': 'Muhammad Ali',
                'category': 'motivation'
            },
            {
                'quote_text': 'The only way to define your limits is by going beyond them.',
                'author': 'Arthur C. Clarke',
                'category': 'perseverance'
            },
            {
                'quote_text': 'Strength does not come from the body. It comes from the will.',
                'author': 'Arnold Schwarzenegger',
                'category': 'strength'
            },
            {
                'quote_text': "You don't have to be great to start, but you have to start to be great.",
                'author': 'Zig Ziglar',
                'category': 'motivation'
            },
            {
                'quote_text': "The difference between the impossible and the possible lies in a person's determination.",
                'author': 'Tommy Lasorda',
                'category': 'determination'
            },
            {
                'quote_text': "Your body can stand almost anything. It's your mind that you have to convince.",
                'author': 'Unknown',
                'category': 'mindset'
            },
            {
                'quote_text': "Take care of your body. It's the only place you have to live.",
                'author': 'Jim Rohn',
                'category': 'health'
            },
            {
                'quote_text': 'The clock is ticking. Are you becoming the person you want to be?',
                'author': 'Greg Plitt',
                'category': 'motivation'
            },
            {
                'quote_text': "Whether you think you can or you think you can't, you're right.",
                'author': 'Henry Ford',
                'category': 'mindset'
            },
            {
                'quote_text': 'The hard days are what make you stronger.',
                'author': 'Aly Raisman',
                'category': 'strength'
            },
            {
                'quote_text': 'Push yourself because no one else is going to do it for you.',
                'author': 'Unknown',
                'category': 'motivation'
            },
            {
                'quote_text': 'Great things never come from comfort zones.',
                'author': 'Unknown',
                'category': 'growth'
            },
            {
                'quote_text': 'The only person you should try to be better than is the person you were yesterday.',
                'author': 'Unknown',
                'category': 'growth'
            },
            {
                'quote_text': 'Sweat is fat crying.',
                'author': 'Unknown',
                'category': 'motivation'
            },
            {
                'quote_text': "If it doesn't challenge you, it doesn't change you.",
                'author': 'Fred DeVito',
                'category': 'growth'
            },
            {
                'quote_text': 'The last three or four reps is what makes the muscle grow. This area of pain divides the champion from someone else who is not a champion.',
                'author': 'Arnold Schwarzenegger',
                'category': 'strength'
            }
        ]
        
        # Add each quote to the database
        for quote_data in quotes:
            quote = MotivationalQuote(
                quote_text=quote_data['quote_text'],
                author=quote_data['author'],
                category=quote_data['category'],
                active=True
            )
            db.session.add(quote)
        
        # Commit all quotes
        db.session.commit()
        
        print(f"✅ Successfully added {len(quotes)} motivational quotes!")
        print("🎉 Dashboard quotes feature is now ready!")

if __name__ == '__main__':
    init_quotes()


