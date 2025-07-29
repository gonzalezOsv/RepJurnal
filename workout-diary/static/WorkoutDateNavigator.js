import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, addDays, parseISO } from 'date-fns';

const WorkoutDateNavigator = ({ workouts }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dailyWorkouts, setDailyWorkouts] = useState([]);

  useEffect(() => {
    // Filter workouts for the current date
    const formattedDate = format(currentDate, 'yyyy-MM-dd');
    const todaysWorkouts = workouts.filter(workout => 
      workout.date === formattedDate
    );
    setDailyWorkouts(todaysWorkouts);
  }, [currentDate, workouts]);

  const navigateDate = (days) => {
    setCurrentDate(prevDate => addDays(prevDate, days));
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={() => navigateDate(-1)} 
          className="hover:bg-gray-100 p-2 rounded-full transition"
        >
          <ChevronLeft className="text-gray-600" />
        </button>
        
        <div className="flex items-center space-x-2">
          <Calendar className="text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">
            {format(currentDate, 'EEEE, MMMM d, yyyy')}
          </h2>
        </div>
        
        <button 
          onClick={() => navigateDate(1)} 
          className="hover:bg-gray-100 p-2 rounded-full transition"
        >
          <ChevronRight className="text-gray-600" />
        </button>
      </div>

      {dailyWorkouts.length > 0 ? (
        <div className="space-y-4">
          {dailyWorkouts.map((workout, index) => (
            <div 
              key={index} 
              className="bg-blue-50 p-4 rounded-lg border border-blue-100"
            >
              <h3 className="font-bold text-blue-800 mb-2">
                {workout.type} Workout
              </h3>
              <p className="text-gray-700">
                {workout.description || 'No additional details'}
              </p>
              {workout.exercises && (
                <ul className="mt-2 text-sm text-gray-600">
                  {workout.exercises.map((exercise, idx) => (
                    <li key={idx}>
                      {exercise.name}: {exercise.sets} sets, {exercise.reps} reps
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 italic">
          No workouts logged for this date
        </div>
      )}
    </div>
  );
};

export default WorkoutDateNavigator;