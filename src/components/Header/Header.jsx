import logo from "../../assets/logo.svg"

const Header = () => {
    return (
        <div className="flex bg-[#FAFAFA] border border-b border-[#EE4B4A1F] h-[60px] items-center justify-between w-full font-tenon">
            <div className='mx-4 my-2'>
                <img src={logo} alt="AIQA Logo" />
            </div>
            <div className="flex items-center gap-4 mx-4 my-2">
                <span className="text-gray-900 text-sm font-sans">{localStorage.getItem("userEmail")}</span>
            </div>
        </div>
    )
}

export default Header