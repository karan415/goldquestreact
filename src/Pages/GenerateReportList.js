import React, { useEffect, useRef, useState } from 'react';
import "react-datepicker/dist/react-datepicker.css";
import Swal from 'sweetalert2';
import { MdArrowBackIosNew, MdArrowForwardIos } from "react-icons/md";
import PulseLoader from 'react-spinners/PulseLoader';
import { useApiCall } from '../ApiCallContext';

const GenerateReportList = () => {
  const { isApiLoading, setIsApiLoading } = useApiCall();

  const [expandedRows, setExpandedRows] = useState({}); // State to track expanded rows
  const [loading, setLoading] = useState(false)
  const [itemsPerPage, setItemPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const toggleRow = (index) => {
    setExpandedRows((prev) => ({
      ...prev,
      [index]: !prev[index], // Toggle the expanded state of the row
    }));
  };

  useEffect(() => {
    const admin_id = JSON.parse(localStorage.getItem("admin"))?.id || "";
    const storedToken = localStorage.getItem("_token") || "";

    const requestOptions = {
      method: "GET",
      redirect: "follow",
    };

    setIsApiLoading(true);
    setLoading(true);

    fetch(
      `https://api.goldquestglobal.in/report-summary/report-generation?admin_id=${admin_id}&_token=${storedToken}`,
      requestOptions
    )
      .then((response) => response.json().then(result => {
        // Handle token expiration check
        const newToken = result._token || result.token;
        if (newToken) {
          localStorage.setItem("_token", newToken); // Update token in localStorage
        }

        if (result.message && result.message.toLowerCase().includes("invalid") && result.message.toLowerCase().includes("token")) {
          Swal.fire({
            title: "Session Expired",
            text: "Your session has expired. Please log in again.",
            icon: "warning",
            confirmButtonText: "Ok",
          }).then(() => {
            window.location.href = "/admin-login"; // Redirect to login page on token expiration
          });
          return; // Stop further processing if token expired
        }

        if (!response.ok) {
          Swal.fire({
            title: 'Error!',
            text: `An error occurred: ${result.message}`,
            icon: 'error',
            confirmButtonText: 'Ok'
          });
          throw new Error('Network response was not ok');
        }

        return result; // Return the successful result if no errors
      }))
      .then((result) => {
        console.log("Parsed result:", result); // Log the parsed result

        // Handle new token if available
        const newToken = result._token || result.token;
        if (newToken) {
          console.log("New token received:", newToken); // Log new token
          localStorage.setItem("_token", newToken); // Store the new token in localStorage
        }

        // Check for invalid or expired token message
        if (
          result.message &&
          result.message.toLowerCase().includes("invalid") &&
          result.message.toLowerCase().includes("token")
        ) {
          console.log("Invalid token detected. Showing session expired alert...");
          Swal.fire({
            title: "Session Expired",
            text: "Your session has expired. Please log in again.",
            icon: "warning",
            confirmButtonText: "Ok",
          }).then(() => {
            console.log("Redirecting to login page...");
            window.location.href = "/admin-login"; // Redirect to login page
          });
          throw new Error("Session expired"); // Stop further processing
        }

        // If status is false, show the error message from API
        if (result.status === false) {
          console.log("API response indicates failure:", result.message); // Log failure message
          Swal.fire({
            icon: "error",
            title: "Oops...",
            text: result.message || "Failed to fetch data.",
          });
          return;
        }

        // Proceed with handling the data if everything is successful
        console.log("Processing result data...");

        // Flatten the data to match the table structure
        const flattenedReports = result.result.flatMap((customer) =>
          customer.branches.flatMap((branch) =>
            branch.applications.map((app) => ({
              applicationId: app.application_id,
              applicantName: app.application_name,
              status: app.overall_status,
              services: app.services_status, // Including the services status
            }))
          )
        );

        console.log("Flattened reports:", flattenedReports); // Log flattened reports
        setData(flattenedReports); // Set the flattened data to the state
      })
      .catch((error) => {
        console.error("Error fetching data:", error); // Log any network or processing error

      })
      .finally(() => {
        console.log("Fetch complete, loading stopped.");
        setLoading(false);
        setIsApiLoading(false); // Stop loading after fetch completes
      });
  }, []); // Empty dependency array to run this effect only once on mount

  const filteredItems = data.filter(item => {
    return (
      item.applicationId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.applicantName?.toLowerCase()?.includes(searchTerm.toLowerCase())
    );
  });


  // Pagination logic
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);

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

    // Handle pagination with ellipsis
    if (totalPages <= 5) {
      // If there are 5 or fewer pages, show all page numbers
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show the first page
      pageNumbers.push(1);

      // Show ellipsis if current page is greater than 3
      if (currentPage > 3) {
        pageNumbers.push('...');
      }

      // Show two pages around the current page
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        if (!pageNumbers.includes(i)) {
          pageNumbers.push(i);
        }
      }

      // Show ellipsis if current page is less than total pages - 2
      if (currentPage < totalPages - 2) {
        pageNumbers.push('...');
      }

      // Always show the last page
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
  const handleSelectChange = (e) => {

    const selectedValue = e.target.value;
    setItemPerPage(selectedValue)
  }


  const tableRef = useRef(null); // Ref for the table container

  // Function to reset expanded rows
  const handleOutsideClick = (event) => {
    if (tableRef.current && !tableRef.current.contains(event.target)) {
      setExpandedRows({}); // Reset to empty object instead of null
    }
  };


  useEffect(() => {
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);


  return (
    <>
      <div className=" py-4 px-4">

        <h2 className='text-center md:text-3xl text-xl font-bold py-4'>Report Generate DATA</h2>
        <div className="md:grid grid-cols-2 justify-between items-center md:my-4 border-b-2 pb-4">
          <div className="col">
            <form action="">
              <div className="flex gap-5 justify-between">
                <select name="options" onChange={handleSelectChange} id="" className='outline-none border p-2 ps-2 text-left rounded-md w-full md:w-6/12'>
                  <option value="10">10 Rows</option>
                  <option value="20">20 Rows</option>
                  <option value="50">50 Rows</option>
                  <option value="200">200 Rows</option>
                  <option value="300">300 Rows</option>
                  <option value="400">400 Rows</option>
                  <option value="500">500 Rows</option>
                </select>
              </div>
            </form>
          </div>
          <div className="col md:flex justify-end ">
            <form action="">
              <div className="flex md:items-stretch items-center  gap-3">
                <input
                  type="search"
                  className='outline-none border p-2 text-sm rounded-md w-full my-4 md:my-0'
                  placeholder='Search by Client Code'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </form>
          </div>

        </div>
        {loading ? (
          <div className='flex justify-center items-center py-6 h-full'>
            <PulseLoader color="#36D7B7" loading={loading} size={15} aria-label="Loading Spinner" />

          </div>
        ) : currentItems.length > 0 ? (
          <div className='overflow-x-auto' ref={tableRef}>
            <table className="min-w-full">
              <thead>
                <tr className="bg-green-500">
                  <th className="py-2 text-center text-white border-r px-4 border-b whitespace-nowrap uppercase">SL</th>
                  <th className="py-2 text-center text-white border-r px-4 border-b whitespace-nowrap uppercase">Application ID</th>
                  <th className="py-2 text-left text-white border-r px-4 border-b whitespace-nowrap uppercase">Name Of Applicant</th>
                  <th className="py-2 text-center text-white border-r px-4 border-b whitespace-nowrap uppercase">Overall Status</th>
                  <th className="py-2 text-center text-white border-r px-4 border-b whitespace-nowrap uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((report, index) => (
                  <React.Fragment key={index}>
                    <tr>
                      <td className="py-2 px-4 text-center border-l border-b border-r whitespace-nowrap">{index + 1}</td>
                      <td className="py-2 px-4 text-center border-b border-r whitespace-nowrap">{report.applicationId}</td>
                      <td className="py-2 px-4 text-left border-b border-r whitespace-nowrap">{report.applicantName}</td>
                      <td className="py-2 px-4 text-center border-b border-r whitespace-nowrap">{report.status}</td>

                      <td className="py-2 px-4 text-center border-b border-r whitespace-nowrap">
                        <button
                          className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-blue-200"
                          onClick={() => toggleRow(index)}
                        >
                          {expandedRows[index] ? "Hide Services" : "View More"}
                        </button>
                      </td>
                    </tr>
                    {expandedRows[index] && (
                      <tr>
                        <td colSpan={8} className="py-2 px-4 text-left border-b border-r whitespace-nowrap bg-gray-100">
                          <table className="w-full">
                            <thead>
                              <tr >
                                {Object.entries(report.services).map(([service, status], i) => (

                                  <th className="py-2 px-4">{service}</th>

                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr >
                                {Object.entries(report.services).map(([service, status], i) => (

                                  <td className="py-2 px-4">{status}</td>

                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}


                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6">
            <p>No Data Found</p>
          </div>
        )}
        <div className="flex items-center justify-end  rounded-md px-4 py-3 sm:px-6 md:m-4 mt-2">
          <button
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
  )
}

export default GenerateReportList