import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SignupBuyer = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        gender: 'Male',
        phone: '',
        city: '',
        state: '',
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
                    role: 'BUYER',
                    email: formData.email,
                    password: formData.password,
                    profileData: {
                        fullName: formData.fullName,
                        gender: formData.gender,
                        phone: formData.phone,
                        city: formData.city,
                        state: formData.state,
                        language: formData.language,
                    },
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Signup failed');
            }

            login(data.token, data.user);
            navigate('/buyer/dashboard');

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
                    <h2 className="text-center text-3xl font-extrabold text-gray-900">Buyer Registration</h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Join as a Buyer to purchase fresh produce.
                    </p>
                </div>

                <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                    {error && <div className="text-red-600 text-sm text-center">{error}</div>}

                    <div className="grid grid-cols-1 gap-4">
                        <input name="fullName" type="text" placeholder="Full Name / Business Name" autoComplete="name" required className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" onChange={handleChange} />

                        <select name="gender" autoComplete="sex" className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" onChange={handleChange}>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>

                        <input name="email" type="email" placeholder="Email Address" autoComplete="email" required className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" onChange={handleChange} />

                        <input name="phone" type="tel" placeholder="Phone Number (Optional)" autoComplete="tel" className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" onChange={handleChange} />

                        <div className="grid grid-cols-2 gap-4">
                            <input name="password" type="password" placeholder="Password" autoComplete="new-password" required className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" onChange={handleChange} />
                            <input name="confirmPassword" type="password" placeholder="Confirm Password" autoComplete="new-password" required className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" onChange={handleChange} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <input name="city" type="text" placeholder="City" autoComplete="address-level2" required className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" onChange={handleChange} />
                            <input name="state" type="text" placeholder="State" autoComplete="address-level1" required className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" onChange={handleChange} />
                        </div>

                        <select name="language" autoComplete="language" className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" onChange={handleChange}>
                            <option value="ENGLISH">English</option>
                            <option value="HINDI">Hindi</option>
                            <option value="TELUGU">Telugu</option>
                            <option value="TAMIL">Tamil</option>
                            <option value="KANNADA">Kannada</option>
                        </select>
                    </div>

                    <button type="submit" disabled={loading} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        {loading ? 'Registering...' : 'Register'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SignupBuyer;
