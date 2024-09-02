import React, { createContext, useState, useContext } from 'react';
import Swal from 'sweetalert2';


const ClientEditContext = createContext();


export const ClientEditProvider = ({ children }) => {
    const [clientData, setClientData] = useState({
        company_name: '',
        client_code: '',
        address: '',
        mobile_number: '',
        contact_person: '',
        state: '',
        name_of_escalation: '',
        state_code: '',
        client_spoc: '',
        gstin: '',
        tat: '',
        date_agreement: '',
        client_standard: '',
        agreement_period: 'Unless terminated',
        agr_upload: null,
        custom_template: 'no',
        custom_logo: null,
        custom_address: '',
        additional_login: 'No',
        username: '',
        services: [] ,
        clientData:{},
    });

    const handleClientChange = (e, index) => {
        const { name, value, type, files } = e.target;
        setClientData(prevData => ({
            ...prevData,
            [name]: type === 'file' ? files[0] : value,
        }));
    };

    const handleClientSubmit = async (e) => {
        e.preventDefault();
        const admin_id = JSON.parse(localStorage.getItem("admin"))?.id;
        const storedToken = localStorage.getItem("_token");

        if (!clientData.company_name || !clientData.client_code || !clientData.address) {
            Swal.fire('Error!', 'Missing required fields: Branch ID, Name, Email', 'error');
            return;
        }

        const raw = JSON.stringify({
            ...clientData,
            admin_id,
            _token: storedToken
        });

        const requestOptions = {
            method: "PUT",
            headers: { 'Content-Type': 'application/json' },
            body: raw,
            redirect: "follow"
        };

        try {
            const response = await fetch('https://goldquestreact.onrender.com/customer/update', requestOptions);
            if (!response.ok) {
                return response.text().then(text => {
                    const errorData = JSON.parse(text);
                    Swal.fire('Error!', `An error occurred: ${errorData.message}`, 'error');
                });
            }

            const newToken = response._token || response.token;
            if (newToken) {
                localStorage.setItem("_token", newToken);
            }
            Swal.fire('Success!', 'Branch updated successfully.', 'success');
        } catch (error) {
            console.error('There was a problem with the fetch operation:', error);
        }
    };

    return (
        <ClientEditContext.Provider value={{ clientData, setClientData, handleClientChange, handleClientSubmit }}>
            {children}
        </ClientEditContext.Provider>
    );
};


export const useEditClient = () => useContext(ClientEditContext);
