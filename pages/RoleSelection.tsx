import React from 'react';
import { useNavigate } from 'react-router-dom';

const RoleSelection = () => {
    const navigate = useNavigate();

    const handleRoleSelect = (role: string) => {
        switch (role) {
            case 'FARMER':
                navigate('/signup/farmer');
                break;
            case 'BUYER':
                navigate('/signup/buyer');
                break;
            case 'TRANSPORTER':
                navigate('/signup/transporter');
                break;
            case 'ADMIN':
                // Admin signup is not public, maybe redirect to login or show message
                alert('Admin signup is restricted.');
                break;
            default:
                break;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Join KisanSetu</h1>
            <p className="text-gray-600 mb-8 max-w-md text-center">
                Select your role to get started. Choose the account type that best describes you.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                {/* Farmer Card */}
                <div
                    onClick={() => handleRoleSelect('FARMER')}
                    className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-green-500 flex flex-col items-center"
                >
                    <div className="text-6xl mb-4">👨‍🌾</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Farmer</h3>
                    <p className="text-gray-500 text-center">Sell your crops directly to buyers and get the best prices.</p>
                </div>

                {/* Buyer Card */}
                <div
                    onClick={() => handleRoleSelect('BUYER')}
                    className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-blue-500 flex flex-col items-center"
                >
                    <div className="text-6xl mb-4">🧑‍💼</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Buyer</h3>
                    <p className="text-gray-500 text-center">Source fresh produce directly from farmers.</p>
                </div>

                {/* Transporter Card */}
                <div
                    onClick={() => handleRoleSelect('TRANSPORTER')}
                    className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-orange-500 flex flex-col items-center"
                >
                    <div className="text-6xl mb-4">🚚</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Transporter</h3>
                    <p className="text-gray-500 text-center">Earn by delivering crops from farms to buyers.</p>
                </div>
            </div>

            <div className="mt-8 text-gray-600">
                Already have an account? <a href="/login" className="text-green-600 hover:underline font-medium">Login here</a>
            </div>
        </div>
    );
};

export default RoleSelection;
