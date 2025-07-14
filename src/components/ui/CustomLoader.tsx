import React from "react";

function CustomLoader() {
  return (
    <div className="flex justify-end items-center ">
      <div className="relative w-8 h-8">
        <div className="absolute w-8 h-8 border-4 border-primary rounded-full animate-spin border-t-transparent"></div>
        <div className="absolute w-8 h-8 borƒder-4 border-primary rounded-full animate-ping opacity-25"></div>
      </div>
    </div>
  );
}

export default CustomLoader;
