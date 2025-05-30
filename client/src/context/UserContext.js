import { createContext, useContext, useState } from "react";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [preferredName, setPreferredName] = useState("");

    return (
        <UserContext.Provider value={{ preferredName, setPreferredName }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUserContext = () => useContext(UserContext);
