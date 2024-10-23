import React from "react";
import Logout from "./Logout";
const Header = () => {
  return (
    <header className="p-4 md:p-6 flex flex-wrap flex-col-reverse md:flex-row items-center justify-between bg-white shadow-lg ">
      <div className="flex items-center space-x-4  md:mt-0 w-full md:w-2/4">
      <p className="text-gray-400 text-lg  mb-2 text-left w-full">Background Verification Tracking System.</p>

      </div>
      <Logout/>
   
    </header>
  );
};

export default Header;
