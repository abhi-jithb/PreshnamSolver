import React from 'react';
import { Coffee, Github, Linkedin, Mail } from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-32 h-32 mx-auto rounded-full overflow-hidden mb-4">
              <img 
                src="/logo.png" 
                alt="Preshnam Solver Logo" 
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              About Preshnam Solver
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Your Safety, Our Priority
            </p>
          </div>

          <div className="prose dark:prose-invert max-w-none">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Meet the Developer
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Hi! I'm Abhijith B, the developer behind Preshnam Solver. I created this application 
              with the vision of making emergency assistance more accessible and efficient.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Why Preshnam Solver?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              In today's fast-paced world, having quick access to emergency assistance is crucial. 
              Preshnam Solver connects you with your trusted friends and family during emergencies, 
              ensuring help is just a click away.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Features
            </h3>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 mb-6">
              <li>One-click SOS alerts</li>
              <li>Real-time location sharing</li>
              <li>Instant notifications to friends</li>
              <li>Friend management system</li>
              <li>Secure authentication</li>
              <li>Dark mode support</li>
            </ul>

            <div className="flex flex-col items-center space-y-6 mt-8">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Support the Project
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center">
                If you find this project helpful and would like to support its development, 
                consider buying me a coffee! Your support helps me maintain and improve this project.
              </p>
              <a 
                href="https://www.buymeacoffee.com/abhijithb" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-amber-600 text-white rounded-lg 
                  hover:bg-amber-700 transition-colors"
              >
                <Coffee className="w-5 h-5 mr-2" />
                Buy Me a Coffee
              </a>
            </div>

            <div className="flex justify-center space-x-6 mt-8">
              <a 
                href="https://github.com/abhi-jithb" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 
                  dark:hover:text-white transition-colors"
              >
                <Github className="w-6 h-6" />
              </a>
              <a 
                href="https://linkedin.com/in/abhi-jithb" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 
                  dark:hover:text-white transition-colors"
              >
                <Linkedin className="w-6 h-6" />
              </a>
              <a 
                href="mailto:preshnamsolver@gmail.com" 
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 
                  dark:hover:text-white transition-colors"
              >
                <Mail className="w-6 h-6" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 