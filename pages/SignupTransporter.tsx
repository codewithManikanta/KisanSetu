import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SignupTransporter = () => {
    const navigate = useNavigate();
    const { login } = useAuth(); // Note: login might not set token if pending approval
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        gender: 'Male',
        phone: '',
        vehicleType: '',
        vehicleNumber: '',
        capacity: '',
        pricePerKm: '',
        language: 'ENGLISH',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('http://localhost:5000/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    role: 'TRANSPORTER',
                    email: formData.email,
                    password: formData.password,
                    profileData: {
                        fullName: formData.fullName,
                        gender: formData.gender,
                        phone: formData.phone,
                        vehicleType: formData.vehicleType,
                        vehicleNumber: formData.vehicleNumber,
                        capacity: parseFloat(formData.capacity),
                        pricePerKm: parseFloat(formData.pricePerKm),
                        language: formData.language,
                    },
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Signup failed');
            }

            // Transporters are pending approval, so we redirect to a pending page or show a message
            if (data.user.status === 'PENDING_APPROVAL') {
                navigate('/transporter/pending-approval');
            } else {
                login(data.token, data.user);
                navigate('/transporter/dashboard');
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
                <div>
                    <h2 className="text-center text-3xl font-extrabold text-gray-900">Transporter Registration</h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Join as a Transporter to deliver goods.
                    </p>
                </div>

                <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                    {error && <div className="text-red-600 text-sm text-center">{error}</div>}

                    <div className="grid grid-cols-1 gap-4">
                        <input name="fullName" type="text" placeholder="Full Name" required className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm" onChange={handleChange} />

                        <select name="gender" className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm" onChange={handleChange}>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>

                        <input name="email" type="email" placeholder="Email Address" required className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm" onChange={handleChange} />

                        <input name="phone" type="tel" placeholder="Phone Number" required className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm" onChange={handleChange} />

                        <div className="grid grid-cols-2 gap-4">
                            <input name="password" type="password" placeholder="Password" required className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm" onChange={handleChange} />
                            <input name="confirmPassword" type="password" placeholder="Confirm Password" required className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm" onChange={handleChange} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <input name="vehicleType" type="text" placeholder="Vehicle Type (e.g. Truck)" required className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm" onChange={handleChange} />
                            <input name="vehicleNumber" type="text" placeholder="Vehicle Number" required className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm" onChange={handleChange} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <input name="capacity" type="number" step="100" placeholder="Max Load Capacity (kg)" required className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm" onChange={handleChange} />
                            <input name="pricePerKm" type="number" step="1" placeholder="Cost per km (₹)" required className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm" onChange={handleChange} />
                        </div>

                        <select name="language" className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm" onChange={handleChange}>
                            <option value="ENGLISH">English</option>
                            <option value="HINDI">Hindi</option>
                            <option value="TELUGU">Telugu</option>
                            <option value="TAMIL">Tamil</option>
                            <option value="KANNADA">Kannada</option>
                        </select>
                    </div>

                    <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                        {loading ? 'Submitting Application...' : 'Submit Application'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SignupTransporter;
