import { Link } from "react-router-dom";

export const LogoHeader = () => {
  return (
    <div className="bg-white py-5 px-6 flex items-center justify-center shadow-sm border-b border-gray-light relative z-20">
      <Link 
        to="/" 
        className="hover:opacity-80 transition-opacity duration-200 ease-out cursor-pointer"
      >
        <h1 className="text-4xl font-semibold text-center">
          <span className="text-graphite">Job</span>
          <span className="text-mint">Swipe</span>
        </h1>
      </Link>
    </div>
  );
};
