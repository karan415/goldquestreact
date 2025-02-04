import React, { useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { LoaderContext } from '../LoaderContext';
import Loader from '../Loader'
import { useApi } from '../ApiContext';
import Swal from 'sweetalert2';
const Admin = ({ children }) => {


  const { loading, setLoading } = useContext(LoaderContext);
  const API_URL = useApi();
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const checkAuthentication = async () => {
      const storedAdminData = localStorage.getItem("admin");
      const storedToken = localStorage.getItem("_token");

      // If no admin or token data in localStorage, clear session and redirect to login
      if (!storedAdminData || !storedToken) {
        localStorage.removeItem("admin");
        localStorage.removeItem("_token");
        redirectToLogin("No active session found. Please log in again.");
        return;
      }

      let adminData;
      try {
        adminData = JSON.parse(storedAdminData);
      } catch (error) {
        console.error("Error parsing JSON from localStorage:", error);
        Swal.fire({
          title: "Authentication Error",
          text: "Error parsing admin data from localStorage.",
          icon: "error",
          confirmButtonText: "Ok",
        }).then(() => redirectToLogin());
        return;
      }

      try {
        // Send the verification request to the server
        const response = await axios.post(`${API_URL}/admin/verify-admin-login`, {
          admin_id: adminData.id,
          _token: storedToken,
        });

        const responseData = response.data;

        // If status is true, authentication is successful
        if (responseData.status) {
          setLoading(false);
        } else {
          const errorMessage = responseData.message || "An unknown error occurred";



          if (errorMessage && errorMessage.toLowerCase().includes("invalid") && errorMessage.toLowerCase().includes("token")) {

            // Custom session expired message and redirection to login
            Swal.fire({
              title: "Session Expired",
              text: "Your session has expired. Please log in again.",
              icon: "warning",
              confirmButtonText: "Ok",
            }).then(() => {
              redirectToLogin("Your session has expired. Please log in again.");
            });
            return; // Stop further execution after handling session expiration
          }

          // Handle other login verification errors
          Swal.fire({
            title: "Login Verification Failed",
            text: errorMessage,
            icon: "error",
            confirmButtonText: "Ok",
          }).then(() => redirectToLogin(errorMessage));
        }
      } catch (error) {
        // Handle unexpected errors (e.g., network issues)
        console.error("Error validating login:", error.response?.data?.message || error.message);
        Swal.fire({
          title: "Error",
          text: error.response?.data?.message || "Error validating login.",
          icon: "error",
          confirmButtonText: "Ok",
        }).then(() => redirectToLogin(error.response?.data?.message || "Error validating login."));
      }
    };

    // Redirect to login page and clear session data
    const redirectToLogin = (errorMessage = "Please log in again.") => {
      localStorage.removeItem("admin");
      localStorage.removeItem("_token"); navigate("/admin-login", { state: { from: location, errorMessage }, replace: true });
    };

    checkAuthentication();
  }, [navigate, setLoading, location]);



  if (loading) {
    return (
      <>
        <Loader />
      </>
    );
  }

  return children;
};

export default Admin;
