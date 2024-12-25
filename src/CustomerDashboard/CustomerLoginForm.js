import React, { useState, useEffect } from 'react';
import { FaGoogle, FaFacebook, FaApple } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useApi } from '../ApiContext';
import axios from 'axios';

const CustomerLoginForm = () => {

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
        const admin_id = JSON.parse(localStorage.getItem('admin'))?.id;
        const storedToken = localStorage.getItem('_token');

        try {
            const response = await fetch(`${API_URL}/customer/fetch-branch-password?branch_email=${email}&admin_id=${admin_id}&_token=${storedToken}`);
            const result = await response.json();
            if (result.password) {
                setInput(prev => ({
                    ...prev,
                    password: result.password
                }));
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    useEffect(() => {
        if (input.email) {
            getPassword(input.email);
        }
    }, [input.email]);

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
        const adminNewToken = localStorage.getItem('adminNewToken'); // Check for adminNewToken
        
        if (Object.keys(validateError).length === 0) {
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
                        text: 'OTP SEND SUCCESFULY',
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
                    //  // Hide OTP modal// Handle success response
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
    };
    return (
        <div className="w-full md:max-w-7xl mx-auto p-4">
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
                    <label htmlFor="Password" className='d-block'>Enter Your Password:</label>
                    <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        id="YourPassword"
                        onChange={handleChange}
                        value={input.password}
                        className='outline-none p-3 border mt-3 w-full rounded-md' />
                    {error.password && <p className='text-red-500'>{error.password}</p>}
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
                    <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full" type="submit">
                        Sign In
                    </button>
                </div>
            </form>
            {showOtpModal && (
               <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center">
               <div className="bg-white rounded-lg p-6 w-96 relative">
                  
                   <button
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
                       className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full ${
                           isOtpLoading ? 'opacity-50 cursor-not-allowed' : ''
                       }`}
                       onClick={handleOtpSubmit}
                       disabled={isOtpLoading}
                   >
                       {isOtpLoading ? 'Verifying...' : 'Verify'}
                   </button>
               </div>
           </div>
           
            )}
            <div className="text-center my-4">
                <p className="text-sm">Don't have an account? <a href="#" className="text-red-500 hover:text-blue-800">Sign up</a></p>
            </div>
            <div className="flex items-center justify-between my-4">
                <div className="w-1/4 border-t border-gray-300"></div>
                <div className="w-1/2 text-center text-gray-500">or login with</div>
                <div className="w-1/4 border-t border-gray-300"></div>
            </div>
            <div className="flex justify-center gap-4">
                <button className="bg-white border border-blue-500 rounded-sm p-3 w-12 text-center">
                    <FaGoogle className="h-6 w-6 text-blue-700 m-auto" />
                </button>
                <button className="bg-white border border-blue-500 rounded-sm p-3 w-12 text-center">
                    <FaFacebook className="h-6 w-6 text-gray-700 m-auto" />
                </button>
                <button className="bg-white border border-blue-500 rounded-sm p-3 w-12 text-center">
                    <FaApple className="h-6 w-6 text-black-700 m-auto" />
                </button>
            </div>
        </div>

    );
};

export default CustomerLoginForm;