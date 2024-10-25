import React, { useCallback, useEffect, useState, useContext } from 'react';
import { useApi } from '../ApiContext';
import Swal from 'sweetalert2';
import { useSidebar } from '../Sidebar/SidebarContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { BranchContextExel } from './BranchContextExel';
import { useNavigate } from 'react-router-dom';
import { MdArrowBackIosNew, MdArrowForwardIos } from "react-icons/md";
const ExelTrackerStatus = () => {
    const { handleTabChange } = useSidebar();
    const [itemsPerPage, setItemPerPage] = useState(10)
    const [selectedStatus, setSelectedStatus] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [allInputDetails, setAllInputDetails] = useState([]);
    const [parentCustomer, setParentCustomer] = useState([]);
    const [pdfData, setPdfData] = useState([]);
    const [serviceTitleValue, setServiceTitleValue] = useState([]);
    const [cmtAllData, setCmtAllData] = useState([]);
    const [dbHeadingsStatus, setDBHeadingsStatus] = useState({});
    const [applicationData, setApplicationData] = useState([]);
    const [expandedRows, setExpandedRows] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [serviceHeadings, setServiceHeadings] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const navigate = useNavigate();
    const { branch_id, setApplicationId, setServiceId } = useContext(BranchContextExel);
    const API_URL = useApi();
    const admin_id = JSON.parse(localStorage.getItem("admin"))?.id;
    const storedToken = localStorage.getItem("_token");
    const [options, setOptions] = useState([]);
    const requestOptions = {
        method: "GET",
        redirect: "follow",
    };

    const fetchApplications = useCallback(() => {
        setLoading(true);
        fetch(`${API_URL}/client-master-tracker/applications-by-branch?branch_id=${branch_id}&admin_id=${admin_id}&_token=${storedToken}`, requestOptions)
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        const errorData = JSON.parse(text);
                        // Swal.fire('Error!', `An error occurred: ${errorData.message}`, 'error');
                        throw new Error(errorData.message);
                    });
                }
                return response.json();
            })
            .then(data => {
                const newToken = data._token || data.token;
                if (newToken) {
                    localStorage.setItem("_token", newToken);
                }
                setApplicationData(data.customers || []);
            })
            .catch(error => {

                setError('Failed to load data');
            })
            .finally(() => setLoading(false));
    }, [API_URL, branch_id, admin_id, storedToken]);



    useEffect(() => {
        fetchApplications();
    }, [fetchApplications]);

    const handleToggle = useCallback((index, services, id) => {
        if (!admin_id || !storedToken || !id) {
            console.error("Missing required parameters");
            return;
        }


        const newExpandedRow = expandedRows === index ? null : index;
        setExpandedRows(newExpandedRow);

        if (newExpandedRow === index && services) {
            const servicesArray = services.split(',').map(Number);


            const uniqueServiceHeadings = new Set();
            const uniqueStatuses = new Set();


            Promise.all(
                servicesArray.map(serviceId => {
                    const url = `${API_URL}/client-master-tracker/report-form-json-by-service-id?service_id=${serviceId}&admin_id=${admin_id}&_token=${storedToken}`;

                    return fetch(url, requestOptions)
                        .then(response => {
                            if (!response.ok) throw new Error('Network response was not ok');
                            return response.json();
                        })
                        .then(result => {
                            const { reportFormJson } = result;
                            const parsedData = JSON.parse(reportFormJson.json);
                            const { heading, db_table } = parsedData;

                            // Add unique heading to the Set
                            uniqueServiceHeadings.add(heading);

                            // Convert the Set to an array before updating state
                            setServiceHeadings(prev => ({
                                ...prev,
                                [id]: Array.from(uniqueServiceHeadings)  // Convert Set to Array
                            }));

                            // Update token if available
                            const newToken = result._token || result.token;
                            if (newToken) localStorage.setItem("_token", newToken);
                            return db_table;
                        })
                        .catch(error => console.error('Fetch error:', error));
                })
            ).then(parsedDbs => {
                const uniqueDbNames = [...new Set(parsedDbs.filter(Boolean))];

                // Fetch annexure data for unique DB tables
                const annexureFetches = uniqueDbNames.map(db_name => {
                    const url = `${API_URL}/client-master-tracker/annexure-data?application_id=${id}&db_table=${db_name}&admin_id=${admin_id}&_token=${storedToken}`;

                    return fetch(url, requestOptions)
                        .then(response => {
                            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                            return response.json();
                        })
                        .then(result => {
                            const status = result?.annexureData?.status || 'N/A';

                            // Add unique status
                            uniqueStatuses.add(status);

                            return {
                                db_table: db_name,
                                status
                            };
                        })
                        .catch(error => console.error("Fetch error: ", error));
                });


                return Promise.all(annexureFetches).then(annexureStatusArr => {
                    setDBHeadingsStatus(prev => ({
                        ...prev,
                        [id]: annexureStatusArr
                    }));


                    // console.log('Unique Service Headings:', Array.from(uniqueServiceHeadings));
                    // console.log('Unique Statuses:', Array.from(uniqueStatuses));
                });
            })
                .catch(error => console.error("Error during service fetch or annexure fetch: ", error));
        }
    }, [expandedRows, admin_id, storedToken, API_URL, requestOptions]);

    
    const generateReport = (id, services) => {
        navigate('/candidate');
        setApplicationId(id);
        setServiceId(services);
    };


    const fetchSelectOptions = useCallback(() => {
        const admin_id = JSON.parse(localStorage.getItem("admin"))?.id;
        const storedToken = localStorage.getItem("_token");

        const requestOptions = {
            method: "GET",
            redirect: "follow"
        };

        fetch(`${API_URL}/client-master-tracker/branch-filter-options?branch_id=${branch_id}&admin_id=${admin_id}&_token=${storedToken}`, requestOptions)
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then((result) => {
                setOptions(result.filterOptions);
            })
            .catch((error) => console.error('Error fetching options:', error));
    }, []);


    useEffect(() => {
        fetchSelectOptions();
    }, [fetchSelectOptions])



    const fetchCustomers = useCallback(() => {
        const admin_id = JSON.parse(localStorage.getItem("admin"))?.id;
        const storedToken = localStorage.getItem("_token");

        const requestOptions = {
            method: "GET",
            headers: {
                'Content-Type': 'application/json' // Optional, may not be needed for GET
            },
            redirect: "follow"
        };

        fetch(`https://octopus-app-www87.ondigitalocean.app/client-master-tracker/customer-info?customer_id=${applicationData[0]?.customer_id}&admin_id=${admin_id}&_token=${storedToken}`, requestOptions)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json(); // Assuming the response is JSON
            }).then((data) => {
                setParentCustomer(data.customers)
            })

            .catch((error) => console.error('Error fetching customers:', error));
    }, [applicationData])

    useEffect(() => {

        fetchCustomers();
    }, [fetchCustomers]);

    const handleStatusChange = (event) => {
        setSelectedStatus(event.target.value);
    };


    const filteredItems = applicationData.filter(item => {
        return (
            item.application_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });



    const filteredOptions = filteredItems.filter(item =>
        item.status.toLowerCase().includes(selectedStatus.toLowerCase())
    );


    const totalPages = Math.ceil(filteredOptions.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredOptions.slice(indexOfFirstItem, indexOfLastItem);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const showPrev = () => {
        if (currentPage > 1) handlePageChange(currentPage - 1);
    };

    const showNext = () => {
        if (currentPage < totalPages) handlePageChange(currentPage + 1);
    };


    const renderPagination = () => {
        const pageNumbers = [];

        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) {
                pageNumbers.push(i);
            }
        } else {
            pageNumbers.push(1);

            if (currentPage > 3) {
                pageNumbers.push('...');
            }

            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                if (!pageNumbers.includes(i)) {
                    pageNumbers.push(i);
                }
            }

            if (currentPage < totalPages - 2) {
                pageNumbers.push('...');
            }


            if (!pageNumbers.includes(totalPages)) {
                pageNumbers.push(totalPages);
            }
        }



        return pageNumbers.map((number, index) => (
            number === '...' ? (
                <span key={`ellipsis-${index}`} className="px-3 py-1">...</span>
            ) : (
                <button
                    type="button"
                    key={`page-${number}`} // Unique key for page buttons
                    onClick={() => handlePageChange(number)}
                    className={`px-3 py-1 rounded-0 ${currentPage === number ? 'bg-green-500 text-white' : 'bg-green-300 text-black border'}`}
                >
                    {number}
                </button>
            )
        ));
    };


useEffect(() => {
    if (serviceTitleValue.length > 0 && allInputDetails.length > 0 && pdfData && cmtAllData) {
        console.log(`All data is set. Now generating PDF.`);
        generatePDF();
    }
}, [serviceTitleValue, allInputDetails, pdfData, cmtAllData]);

const handleDownloadPdf = async (id, branch_id) => {
    if (!id || !branch_id) {
        return Swal.fire('Error!', 'Something is missing', 'error');
    }

    const adminId = JSON.parse(localStorage.getItem("admin"))?.id;
    const storedToken = localStorage.getItem("_token");
    setLoading(true);
    setError(null);

    try {
        const response = await fetch(
            `https://octopus-app-www87.ondigitalocean.app/client-master-tracker/application-by-id?application_id=${id}&branch_id=${branch_id}&admin_id=${adminId}&_token=${storedToken}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            const errorData = JSON.parse(errorText);
            Swal.fire('Error!', `An error occurred: ${errorData.message}`, 'error');
            throw new Error(errorText);
        }

        const data = await response.json();
        const applications = data.application;
        const serviceIdsArr = applications?.services?.split(',') || [];
        const serviceTitleValue = [];

        // Fetch service data
        if (serviceIdsArr.length > 0) {
            const serviceFetchPromises = serviceIdsArr.map(async (serviceId) => {
                const requestOptions = {
                    method: "GET",
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    redirect: "follow",
                };

                const serviceInfoUrl = `https://octopus-app-www87.ondigitalocean.app/service/service-info?id=${serviceId}&admin_id=${adminId}&_token=${storedToken}`;
                const applicationServiceUrl = `https://octopus-app-www87.ondigitalocean.app/client-master-tracker/application-service?service_id=${serviceId}&application_id=${id}&admin_id=${adminId}&_token=${storedToken}`;

                const [serviceResponse, applicationResponse] = await Promise.all([
                    fetch(serviceInfoUrl, requestOptions),
                    fetch(applicationServiceUrl, requestOptions),
                ]);

                if (!serviceResponse.ok) {
                    return null;
                }

                const serviceData = await serviceResponse.json();
                const applicationData = await applicationResponse.json();

                const title = serviceData.service.title || "N/A";
                serviceTitleValue.push({
                    title,
                    status: applicationData.annexureData?.status || "N/A",
                    info_source: applicationData.annexureData?.info_source || "N/A",
                    verified_at: applicationData.annexureData?.verified_at || "N/A",
                    color_status: applicationData.annexureData?.color_status || "N/A",
                });
            });

            await Promise.all(serviceFetchPromises);
            setServiceTitleValue(serviceTitleValue); // Triggering update here
        }

        // Fetch report form details
        const allInputDetails = [];
        const servicesArray = serviceIdsArr.map(Number);

        await Promise.all(
            servicesArray.map(async (serviceId) => {
                const response = await fetch(
                    `https://octopus-app-www87.ondigitalocean.app/client-master-tracker/report-form-json-by-service-id?service_id=${serviceId}&admin_id=${adminId}&_token=${storedToken}`,
                    {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                );

                if (!response.ok) {
                    const errorText = await response.text();
                    const errorData = JSON.parse(errorText);
                    return;
                }

                const data = await response.json();
                const newToken = data._token || data.token;
                if (newToken) {
                    localStorage.setItem("_token", newToken);
                }

                let parsedJson;
                try {
                    parsedJson = JSON.parse(data.reportFormJson.json || '{}');
                } catch (error) {
                    console.error("Failed to parse reportFormJson:", error);
                    return;
                }

                if (parsedJson.db_table && parsedJson.heading) {
                    const annexureHeading = parsedJson.heading;
                    const annexureURL = `https://octopus-app-www87.ondigitalocean.app/client-master-tracker/annexure-data?application_id=${id}&db_table=${parsedJson.db_table}&admin_id=${adminId}&_token=${storedToken}`;

                    const annexureResponse = await fetch(annexureURL, { method: "GET", redirect: "follow" });
                    if (!annexureResponse.ok) {
                        return;
                    }

                    const annexureResult = await annexureResponse.json();
                    const inputDetails = [];

                    const annexureData = annexureResult.annexureData;
                    parsedJson.rows.forEach(row => {
                        row.inputs.forEach(input => {
                            const value = annexureData && Array.isArray(annexureData)
                                ? (annexureData.find(item => item.name === input.name)?.value || 'N/A')
                                : (annexureData?.[input.name] || 'N/A');

                            inputDetails.push({
                                label: input.label,
                                name: input.name,
                                type: input.type,
                                value: value,
                                options: input.options || undefined,
                            });
                        });
                    });

                    allInputDetails.push({ annexureHeading, inputDetails });
                }
            })
        );

        setAllInputDetails(allInputDetails); // Triggering update here

        // Set application and other related data
        setPdfData(applications);
        const cmtData = data.CMTData;
        setCmtAllData(cmtData);

    } catch (error) {
        console.error('Fetch error:', error);
        setError('Failed to load client data');
    } finally {
        setLoading(false);
    }
};





    const handleSelectChange = (e) => {

        const selectedValue = e.target.value;
        setItemPerPage(selectedValue)
    }

    const goBack = () => {
        handleTabChange('client_master');
    }


    const generatePDF = () => {
        const doc = new jsPDF();

        // Add the logo
        doc.addImage("https://i0.wp.com/goldquestglobal.in/wp-content/uploads/2024/03/goldquestglobal.png?w=771&ssl=1", 'PNG', 10, 10, 50, 20);

        // Title
        doc.setFontSize(20); // Reduced font size
        doc.text("CONFIDENTIAL BACKGROUND VERIFICATION REPORT", 105, 40, { align: 'center' });

        // First Table
        const firstTableData = [
            [
                { content: 'Name of the Candidate', styles: { cellWidth: 'auto' } },
                { content: pdfData?.name || 'N/A' },
                { content: 'Client Name' },
                { content: parentCustomer[0]?.name || 'N/A' },
            ],
            [
                { content: 'Application ID' },
                { content: pdfData?.application_id || 'N/A' },
                { content: 'Report Status' },
                { content: cmtAllData?.report_status || 'N/A' },
            ],
            [
                { content: 'Date of Birth' },
                { content: cmtAllData?.dob ? new Date(cmtAllData.dob).toLocaleDateString() : 'N/A' },
                { content: 'Application Received' },
                { content: pdfData?.updated_at ? new Date(pdfData.updated_at).toLocaleDateString() : 'N/A' },
            ],
            [
                { content: 'Candidate Employee ID' },
                { content: pdfData?.employee_id || 'N/A' },
                { content: 'Insuff Cleared/Reopened' },
                { content: pdfData?.application_id || 'N/A' },
            ],
            [
                { content: 'Report Type' },
                { content: cmtAllData?.report_type || 'N/A' },
                { content: 'Final Report Date' },
                { content: cmtAllData?.report_date ? new Date(cmtAllData.report_date).toLocaleDateString() : 'N/A' },
            ],
            [
                { content: 'Verification Purpose' },
                { content: pdfData?.overall_status || 'N/A' },
                { content: 'Overall Report Status' },
                { content: pdfData?.status || 'N/A' },
            ],
        ];

        doc.autoTable({
            head: [['', '', '', '']],
            body: firstTableData,
            styles: { cellPadding: 3, fontSize: 12, valign: 'middle' }, // Reduced font size
            theme: 'grid',
            margin: { top: 50 },
        });

        // Second Table Header
        // Headers for the second table
        const secondTableHeaders = [
            { title: 'Report Components', dataKey: 'component' },
            { title: 'Information Source', dataKey: 'source' },
            { title: 'Completed Date', dataKey: 'completedDate' },
            { title: 'Verification Status', dataKey: 'status' },
        ];

    
        const secondTableData = serviceTitleValue.map(item => {
          
            const logData = {
                component: item.title || 'N/A',  
                source: item.info_source || 'N/A',  
                completedDate: (item.verified_at && new Date(item.verified_at).toString() !== 'Invalid Date')
                    ? new Date(item.verified_at).toLocaleDateString()  
                    : 'N/A',  
                status: item.status ? item.status.replace(/[_-]/g, ' ') : 'N/A', 
            };

            return logData; 
        });

      
        doc.autoTable({
            head: [secondTableHeaders.map(header => header.title)],  
            body: secondTableData.map(row => [  
                row.component,
                row.source,
                row.completedDate,
                row.status,
            ]),
            styles: { cellPadding: 3, fontSize: 12, valign: 'middle' },  
            theme: 'grid', 
            margin: { top: 20 }, 
        });



        // Fourth Table Headers
        const fourthTableHeaders = [
            { title: 'Component Status', dataKey: 'status' },
            { title: 'REPORT COMPONENTS', dataKey: 'reportComponents' },
            { title: 'INFORMATION SOURCE', dataKey: 'infoSource' },
            { title: 'COMPONENT STATUS 1', dataKey: 'componentStatus1' },
            { title: 'COMPONENT STATUS 2', dataKey: 'componentStatus2' },
            { title: 'COMPONENT STATUS 3', dataKey: 'componentStatus3' },
        ];

        // Sample Data for the Fourth Table
        const fourthTableData = [
            {
                status: '',  // Can be populated dynamically if needed
                reportComponents: 'Example Component 1',
                infoSource: 'Source A',
                componentStatus1: 'Completed',
                componentStatus2: 'Pending',
                componentStatus3: 'N/A',
            },
            {
                status: '',
                reportComponents: 'Example Component 2',
                infoSource: 'Source B',
                componentStatus1: 'In Progress',
                componentStatus2: 'Completed',
                componentStatus3: 'N/A',
            },
            // Add more rows as necessary
        ];

        // AutoTable for the Fourth Table
        doc.autoTable({
            head: [fourthTableHeaders.map(header => header.title)],  // Map only the 'title' for headers
            body: fourthTableData.map(row => [  // Map each row's data to table format
                row.status,
                row.reportComponents,
                row.infoSource,
                row.componentStatus1,
                row.componentStatus2,
                row.componentStatus3,
            ]),
            styles: { cellPadding: 3, fontSize: 12, valign: 'middle' },  // Set cell styles
            theme: 'grid',  // Set the theme to 'grid' for table structure
            margin: { top: 20 },  // Set top margin for table placement
        });


        // Additional content
        doc.setFontSize(16); // Reduced font size
        doc.text("End of summary report", 105, doc.lastAutoTable.finalY + 20, { align: 'center' });

        // Further details
        allInputDetails.forEach(async (annexure, index) => {
            doc.addPage();
            doc.setFontSize(16);
            doc.text(annexure.annexureHeading, 105, 10, { align: 'center' });

            // Prepare annexure data
            const annexureData = annexure.inputDetails.map(input => [
                { content: input.label },
                { content: input.type === 'datepicker' ? (input.value ? new Date(input.value).toLocaleDateString() : 'N/A') : input.value || 'N/A' },
            ]);

            // AutoTable for the annexure data
            doc.autoTable({
                head: [['Application Details', 'Report Details']],
                body: annexureData,
                styles: { cellPadding: 3, fontSize: 12, valign: 'middle' },
                theme: 'grid',
                margin: { top: 20 },
            });

            // Find the annexure image path (assuming the file paths are stored in 'value' of type 'file')
            const annexureImage = annexure.inputDetails.find(input => input.type === 'file');
            if (annexureImage) {
                const imagePath = "https://octopus-app-www87.ondigitalocean.app/" + annexureImage.value;

                try {
                    // Check if the image URL is valid by making a HEAD request
                    const response = await fetch(imagePath, { method: 'HEAD' });

                    if (response.ok) {
                        // If the image exists, add it to the PDF
                        doc.addImage(imagePath, 'JPEG', 10, doc.lastAutoTable.finalY + 10, 190, 0); // 190 for full width
                    } else {
                        console.warn("Image not found:", imagePath);
                    }
                } catch (error) {
                    console.error("Error checking image:", error);
                }
            }
        });




        // Remarks section
        doc.text("Remarks: The following applicant details are verbally verified...", 10, doc.lastAutoTable.finalY + 20);

        // Save PDF
        doc.save('background_verification_report.pdf');
    };

    return (
        <>


            <div className='p-3 my-14'>
                {loading && <div className="loader">Loading...</div>}
                {error && <div>Error: {error}</div>}
                <div className='flex gap-4 justify-end p-4'>
                    <select id="" name='status' onChange={handleStatusChange} className='outline-none border-2 p-2 rounded-md w-5/12 my-4 md:my-0' >
                        {options.map((item, index) => {
                            return item.status !== 'closed' ? (
                                <option key={index} value={item.status}>
                                    {item.status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())} - {item.count}
                                </option>
                            ) : null;
                        })}


                    </select>
                </div>
                <div className="overflow-x-auto  mx-4 bg-white shadow-md rounded-md">
                    <div className="md:flex justify-between items-center md:my-4 border-b-2 pb-4">
                        <div className="col">
                            <form action="">
                                <div className="flex gap-5 justify-between">
                                    <select name="options" id="" onChange={handleSelectChange} className='outline-none pe-14 ps-2 text-left rounded-md w-10/12'>
                                        <option value="10">10 Rows</option>
                                        <option value="20">20 Rows</option>
                                        <option value="50">50 Rows</option>
                                        <option value="100">100 Rows</option>
                                        <option value="200">200 Rows</option>
                                        <option value="300">300 Rows</option>
                                        <option value="400">400 Rows</option>
                                        <option value="500">500 Rows</option>
                                    </select>
                                    <button className="bg-green-600 text-white py-3 px-8 rounded-md capitalize" type='button'>exel</button>
                                    <button onClick={goBack} className="bg-green-500 mx-2 whitespace-nowrap hover:bg-green-400 text-white rounded-md p-3">Go Back</button>

                                </div>
                            </form>
                        </div>
                        <div className="col md:flex justify-end ">
                            <form action="">
                                <div className="flex md:items-stretch items-center  gap-3">
                                    <input
                                        type="search"
                                        className='outline-none border-2 p-2 rounded-md w-full my-4 md:my-0'
                                        placeholder='Search by Client Code, Company Name, or Client Spoc'
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    <button className='bg-green-500 p-3 rounded-md text-whitevhover:bg-green-200 text-white'>Serach</button>
                                </div>
                            </form>
                        </div>

                    </div>
                    {currentItems.length > 0 ? (
                        <>
                            <table className="min-w-full">
                                <thead>
                                    <tr className='bg-green-500'>
                                        <th className="py-3 px-4 border-b text-left border-r-2 uppercase whitespace-nowrap text-white">SL NO</th>
                                        <th className="py-3 px-4 border-b text-left border-r-2 uppercase whitespace-nowrap text-white">Application ID</th>
                                        <th className="py-3 px-4 border-b text-left border-r-2 uppercase whitespace-nowrap text-white">NAME OF THE APPLICANT</th>
                                        <th className="py-3 px-4 border-b text-left border-r-2 uppercase whitespace-nowrap text-white">APPLICANT EMPLOYEE ID</th>
                                        <th className="py-3 px-4 border-b text-left border-r-2 uppercase whitespace-nowrap text-white">Initiation Date</th>
                                        <th className="py-3 px-4 border-b text-left border-r-2 uppercase whitespace-nowrap text-white">Download Status</th>
                                        <th className="py-3 px-4 border-b text-left border-r-2 uppercase whitespace-nowrap text-white">Overall Status</th>
                                        <th className="py-3 px-4 border-b text-left border-r-2 uppercase whitespace-nowrap text-white">Report Data</th>
                                        <th className="py-3 px-4 border-b text-center uppercase whitespace-nowrap text-white">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentItems.map((item, index) => (
                                        <React.Fragment key={item.id}>
                                            <tr>
                                                <td className="py-3 px-4 border-b border-r-2 whitespace-nowrap capitalize">
                                                    <input type="checkbox" className='me-2' />     {index + 1 + (currentPage - 1) * itemsPerPage}
                                                </td>
                                                <td className="py-3 px-4 border-b border-r-2 whitespace-nowrap capitalize">{item.application_id}</td>
                                                <td className="py-3 px-4 border-b border-r-2 whitespace-nowrap capitalize">{item.name}</td>
                                                <td className="py-3 px-4 border-b border-r-2 whitespace-nowrap capitalize">{item.employee_id}</td>
                                                <td className="py-3 px-4 border-b border-r-2 whitespace-nowrap capitalize">{item.created_at}</td>
                                                <td className="py-3 px-4 border-b border-r-2 whitespace-nowrap capitalize"><button className="bg-green-500 hover:bg-green-400 rounded-md p-3 text-white" onClick={() => handleDownloadPdf(item.id, item.branch_id)}>Download Report</button></td>
                                                <td className="py-3 px-4 border-b border-r-2 whitespace-nowrap capitalize">{item.overall_status}</td>
                                                <td className="py-3 px-4 border-b border-r-2 whitespace-nowrap capitalize">
                                                    <button className="bg-green-400 rounded-md text-white p-3" onClick={() => generateReport(item.id, item.services)}>Generate Report</button>
                                                </td>
                                                <td className="py-3 px-4 border-b border-r-2 whitespace-nowrap capitalize">
                                                    <button
                                                        className="bg-green-500 hover:bg-green-400 rounded-md p-3 text-white"
                                                        onClick={() => handleToggle(index, item.services, item.id)}
                                                    >
                                                        {expandedRows === index ? "Hide Details" : "View More"}
                                                    </button>
                                                </td>
                                            </tr>
                                            {expandedRows === index && (
                                                <tr>
                                                    <td colSpan="9" className="p-0">
                                                        <div className='collapseMenu overflow-auto w-full max-w-[1500px]'>
                                                            <table className="min-w-full max-w-full bg-gray-100">
                                                                <thead>
                                                                    <tr>
                                                                        <th className="py-3 px-4 border-b text-left uppercase whitespace-nowrap">TAT Day</th>
                                                                        <th className="py-3 px-4 border-b text-left uppercase whitespace-nowrap">Batch No</th>
                                                                        <th className="py-3 px-4 border-b text-left uppercase whitespace-nowrap">Subclient</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    <tr>
                                                                        <td className="py-3 px-4 border-b whitespace-nowrap capitalize">{item.tatday}</td>
                                                                        <td className="py-3 px-4 border-b whitespace-nowrap capitalize">{item.batch_number}</td>
                                                                        <td className="py-3 px-4 border-b whitespace-nowrap capitalize">{item.sub_client}</td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                            <table className="min-w-full max-w-full bg-gray-100">
                                                                <thead>
                                                                    <tr className='flex w-full'>
                                                                        <th className='bg-green-500 text-white text-left border-l p-2 w-1/2'>Service</th>
                                                                        <th className='bg-green-500 text-white text-left p-2 w-1/2'>Status</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="h-48 overflow-y-auto block">

                                                                    {serviceHeadings[item.id]?.map((serviceValue, index) => {
                                                                        const formattedService = serviceValue?.replace(/\//g, '').toUpperCase() || 'NIL';

                                                                        // Check if dbHeadingsStatus has a corresponding index for the service
                                                                        const statusValue = dbHeadingsStatus[item.id]?.[index]?.status || 'NIL';
                                                                        const formattedStatus = statusValue
                                                                            .replace(/_/g, ' ') // Replace underscores with spaces
                                                                            .toLowerCase() // Convert the whole string to lowercase
                                                                            .split(' ') // Split the string into words
                                                                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                                                            .join(' ');

                                                                        return (
                                                                            <tr key={index} className="flex w-full">

                                                                                <td className="py-3 px-4 border-b whitespace-nowrap capitalize w-1/2">
                                                                                    {formattedService}
                                                                                </td>

                                                                                <td className="py-3 px-4 border-b whitespace-nowrap capitalize w-1/2">
                                                                                    {formattedStatus}
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>

                        </>) : (

                        <><p className='text-center p-5'>No Data Available</p></>
                    )}
                </div>
                <div className="flex items-center justify-end rounded-md bg-white px-4 py-3 sm:px-6 md:m-4 mt-2">
                    <button
                        type='button'
                        onClick={showPrev}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-0 border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        aria-label="Previous page"
                    >
                        <MdArrowBackIosNew />
                    </button>
                    <div className="flex items-center">
                        {renderPagination()}
                    </div>
                    <button
                        type="button"
                        onClick={showNext}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center rounded-0 border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        aria-label="Next page"
                    >
                        <MdArrowForwardIos />
                    </button>
                </div>

            </div>
        </>

    );
};

export default ExelTrackerStatus;