import React, { createContext, useState, useContext, useCallback } from 'react';
import Swal from 'sweetalert2';
import { useApi } from '../ApiContext';
const HolidayManagementContext = createContext();

export const HolidayManagementProvider = ({ children }) => {
    const API_URL = useApi();

    const [selectedService, setSelectedService] = useState(null);// Store Service list
    const [ServiceList, setServiceList] = useState([]); // Store package list
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const editService = (pkg) => {
        setSelectedService(pkg);
    };

    const updateServiceList = (newList) => {
        setServiceList(newList);
    };
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const admin_id = JSON.parse(localStorage.getItem("admin"))?.id;
            const storedToken = localStorage.getItem("_token");
            const queryParams = new URLSearchParams({
                admin_id: admin_id || '',
                _token: storedToken || ''
            }).toString();

            const res = await fetch(`${API_URL}/holiday/list?${queryParams}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await res.json();

            if (!res.ok || !result.status) {
                // Display the error message only once
                Swal.fire({
                    title: 'Error!',
                    text: result.message || 'An error occurred',
                    icon: 'error',
                    confirmButtonText: 'Ok'
                });
                setError(result.message || 'An error occurred');
                return;
            }

            const newToken = result._token || result.token;
            if (newToken) {
                localStorage.setItem('_token', newToken);
            }

            if (result.message && result.message.toLowerCase().includes("invalid") && result.message.toLowerCase().includes("token")) {
                Swal.fire({
                    title: "Session Expired",
                    text: "Your session has expired. Please log in again.",
                    icon: "warning",
                    confirmButtonText: "Ok",
                }).then(() => {
                    // Redirect to admin login page
                    window.location.href = "admin-login"; // Replace with your login route
                });
            }
            const processedData = (result.holidays || []).map((item, index) => ({
                ...item,
                index: index + 1,
                title: item.title,
                date: item.date,
                id: item.id,
            }));

            setData(processedData);
        } catch (error) {
            console.error('Fetch error:', error);
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    }, []);

    return (
        <HolidayManagementContext.Provider value={{ selectedService, editService, ServiceList, updateServiceList, fetchData, loading, setData, data, error, setError }}>
            {children}
        </HolidayManagementContext.Provider>
    );
};

export const useHoliday = () => useContext(HolidayManagementContext);
