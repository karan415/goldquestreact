
import React from "react";
import bg_img from '../Images/login-bg-img.png';

const Dashboard = () => {
  return (
    <>
       <div className=" md:h-screen mt-22 lg:mt-0 m-3 md:m-0 flex items-center flex-wrap justify-center">
        <div className=" bg-white md:w-8/12 m-auto  rounded-md md:p-7 p-3 shadow-lg mt-22 md:mt-0">
        <h2 className="text-center pb-8 font-bold md:text-3xl w-full">Welcome To Customer DashBoard</h2>

        <img
              src={bg_img}
              alt="Logo"
              className="w-7/12 m-auto"
            />
            </div>
      </div>
    </>
  )
};

export default Dashboard;
