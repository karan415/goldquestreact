import React, { useState, useEffect } from 'react';
import { FaGoogle, FaFacebook, FaApple } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useApi } from '../ApiContext';
import axios from 'axios';

const CustomerLoginForm = () => {
    const [loading, setLoading] = useState(false);
    const [loadingPassword, setLoadingPassword] = useState(false);

    const API_URL = useApi();
    const [showPassword, setShowPassword] = useState(false);
    const location = useLocation();
    const query = new URLSearchParams(location.search);
    const emailFromQuery = query.get('email') || '';
    const navigate = useNavigate();
    const [otp, setOtp] = useState('');
    const [showOtpModal, setShowOtpModal] = useState(false); // State for OTP modal
    const [isOtpLoading, setIsOtpLoading] = useState(false);
    const [input, setInput] = useState({
        email: emailFromQuery,
        password: '',
    });
    const [error, setError] = useState({});

    useEffect(() => {
        setInput(prev => ({
            ...prev,
            email: emailFromQuery,
        }));
    }, [emailFromQuery]);

    const getPassword = async (email) => {
        const adminData = localStorage.getItem('admin');
        const storedToken = localStorage.getItem('_token');
    
        // Validate necessary data before proceeding
        if (!adminData || !storedToken) {
            console.error('Missing admin data or token');
            return;
        }
    
        const admin_id = JSON.parse(adminData)?.id;
    
        setLoadingPassword(true);
    
        try {
            const response = await fetch(
                `${API_URL}/customer/fetch-branch-password?branch_email=${encodeURIComponent(email)}&admin_id=${admin_id}&_token=${storedToken}`
            );
    
            const result = await response.json();
    
            if (!response.ok) {
                // Extract and show dynamic error message from API response
                const errorMessage = result?.message || "An unexpected error occurred.";
                Swal.fire({
                    title: "Error!",
                    text: `Failed to fetch password: ${errorMessage}`,
                    icon: "error",
                    confirmButtonText: "OK",
                });
                throw new Error(errorMessage);
            }
    
            if (result?.password) {
                setInput((prev) => ({
                    ...prev,
                    password: result.password,
                }));
            } else {
                Swal.fire({
                    title: "Warning!",
                    text: "Password not found in the response.",
                    icon: "warning",
                    confirmButtonText: "OK",
                });
            }
        } catch (error) {
            console.error('Error fetching password:', error);
            // Show dynamic error message if present in the response
            Swal.fire({
                title: "Error!",
                text: error.message || "An unexpected error occurred while fetching the password.",
                icon: "error",
                confirmButtonText: "OK",
            });
        } finally {
            setLoadingPassword(false);
        }
    };
    


    useEffect(() => {
        if (input.email) {
            getPassword(input.email);
        }
    }, []);

    const validations = () => {
        const newErrors = {};
        if (!input.email) newErrors.email = 'This field is required!';
        if (!input.password) newErrors.password = 'This field is required!';
        return newErrors;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setInput(prev => ({
            ...prev, [name]: value,
        }));
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();

        const validateError = validations();
        const admin_id = JSON.parse(localStorage.getItem('admin'))?.id;
        const storedToken = localStorage.getItem('_token');
        const adminNewToken = localStorage.getItem('adminNewToken');

        if (Object.keys(validateError).length === 0) {
            // Set loading to true when the request is about to be made
            setLoading(true);

            const myHeaders = new Headers();
            myHeaders.append("Content-Type", "application/json");

            const payload = {
                "username": input.email,
                "password": input.password,
            };

            if (admin_id) {
                payload.admin_id = admin_id;
            }

            if (adminNewToken) {
                payload.admin_token = adminNewToken;
            } else if (storedToken) {
                payload.admin_token = storedToken;
            }
            const raw = JSON.stringify(payload);

            try {
                const response = await fetch(`${API_URL}/branch/login`, {
                    method: "POST",
                    headers: myHeaders,
                    body: raw,
                });
                const result = await response.json();

                // Set loading to false when the response is received
                setLoading(false);

                if (!result.status) {
                    Swal.fire({
                        title: 'Error!',
                        text: `An error occurred: ${result.message}`,
                        icon: 'error',
                        confirmButtonText: 'Ok'
                    });
                } else {
                    const branchData = result.branchData;
                    const branch_token = result.token;

                    localStorage.setItem('branch', JSON.stringify(branchData));
                    localStorage.setItem('branch_token', branch_token);

                    Swal.fire({
                        title: "Success",
                        text: 'OTP SEND SUCCESSFULLY',
                        icon: "success",
                        confirmButtonText: "Ok"
                    });

                    if (result.message === "OTP sent successfully.") {
                        setShowOtpModal(true); // Show OTP modal
                    } else {
                        handleLoginSuccess(result);
                    }

                    setError({});
                }
            } catch (error) {
                // Set loading to false in case of an error
                setLoading(false);

                Swal.fire({
                    title: 'Error!',
                    text: `Error: ${error.message}`,
                    icon: 'error',
                    confirmButtonText: 'Ok'
                });
                console.error('Login failed:', error);
            }
        } else {
            setError(validateError);
        }
    };


    const handleLoginSuccess = (result) => {
        const branchData = result.branchData;
        const branch_token = result.token;

        localStorage.setItem('branch', JSON.stringify(branchData));
        localStorage.setItem('branch_token', branch_token);

        Swal.fire({
            title: 'Success',
            text: 'Login Successful',
            icon: 'success',
            confirmButtonText: 'Ok',
        });

        navigate('/customer-dashboard', { state: { from: location }, replace: true });
    };

    const handleOtpSubmit = () => {
        if (!isOtpLoading) {  // Ensure OTP message is only shown once
            Swal.fire({
                title: 'OTP Sent!',
                text: 'Please check your email for the OTP before proceeding.',
                icon: 'info',
                confirmButtonText: 'Ok',
            }).then(() => {
                setIsOtpLoading(true);
        
                axios
                    .post(`${API_URL}/branch/verify-two-factor`, {
                        username: input.email,
                        otp,
                    })
                    .then((response) => {
                        const result = response.data;
                        if (!result.status) {
                            Swal.fire({
                                title: 'Error!',
                                text: result.message,
                                icon: 'error',
                                confirmButtonText: 'Ok',
                            });
                        } else {
                            setShowOtpModal(false);
                            handleLoginSuccess(result);
                        }
                    })
                    .catch((error) => {
                        Swal.fire({
                            title: 'Error!',
                            text: `Error: ${error.response?.data?.message || error.message}`,
                            icon: 'error',
                            confirmButtonText: 'Ok',
                        });
                    })
                    .finally(() => {
                        setIsOtpLoading(false);
                    });
            });
        }
    };
    
    return (
        <div className="w-full md:max-w-7xl md:mx-auto xl:p-4">
            <form onSubmit={handleSubmitForm} aria-live="polite">
                <div className="mb-3">
                    <label htmlFor="email" className='d-block'>Enter Your Email:</label>
                    <input
                        type="email"
                        name="email"
                        id="EmailId"
                        onChange={handleChange}
                        value={input.email}
                        className='outline-none p-3 border mt-3 w-full rounded-md' />
                    {error.email && <p className='text-red-500'>{error.email}</p>}
                </div>
                <div className="mb-3">
                    <label htmlFor="Password" className="d-block">Enter Your Password:</label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            id="YourPassword"
                            onChange={handleChange}
                            value={input.password}
                            className="outline-none p-3 border mt-3 w-full rounded-md"
                            disabled={loadingPassword} // Disable input during loading
                        />
                        {loadingPassword && (
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                <div className="loader border-t-transparent border-gray-400 border-2 w-5 h-5 rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>
                    {error.password && <p className="text-red-500">{error.password}</p>}
                </div>

                <div className="mb-3">
                    <label className="inline-flex items-center">
                        <input
                            type="checkbox"
                            onChange={() => setShowPassword(!showPassword)}
                            className="form-checkbox" />
                        <span className="ml-2">Show Password</span>
                    </label>
                </div>
                <div className="flex items-center justify-between mb-4">
                    <label className="block text-gray-700 text-sm font-bold">
                        <input className="mr-2 leading-tight" type="checkbox" />
                        <span className="text-sm">Remember me</span>
                    </label>
                    <a href="#" className="inline-block align-baseline font-bold text-sm text-red-500 hover:text-blue-800">
                        Forgot Password?
                    </a>
                </div>
                <div className="flex items-center justify-between">
                    <button disabled={loading} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full" type="submit">
                        Sign In
                    </button>
                </div>
            </form>
            {showOtpModal && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white rounded-lg p-6 w-96 relative">

                        <button
                        type='button'
                            className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
                            onClick={() => setShowOtpModal(false)} // Set showOtpModal to false
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                                className="w-6 h-6"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <h3 className="text-xl font-bold mb-4">Enter OTP</h3>
                        <input
                            className="appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
                            type="text"
                            placeholder="Enter 6-digit OTP"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                        />
                        <button
                            type="submit"
                            className={ `cursor-pointer bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full ${isOtpLoading ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                            onClick={handleOtpSubmit}
                            disabled={isOtpLoading}
                        >
                            {isOtpLoading ? 'Verifying...' : 'Verify'}
                        </button>
                    </div>
                </div>

            )}

        </div>

    );
};

export default CustomerLoginForm;