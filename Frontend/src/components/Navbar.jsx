import React from 'react';
import logo from '../assets/fitquest.png';


const Navbar = () => {
  return (
    <div className='bg-gradient-to-r from-black  to-black text-white w-full h-20 flex items-center px-6 sticky'>
      <div className="flex items-center">
        <img src={logo} alt="logo" className="h-14 w-auto object-contain mr-4" />
        <div className='text-2xl font-bold tracking-wide'>FITquest</div>
      </div>

      <div className='ml-auto'>
      
      
    
      
   
       
      </div>
    </div>
  );
}

export default Navbar;
