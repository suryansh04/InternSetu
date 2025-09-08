import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import FormComponent from "./components/FormComponent";
import MainScreen from "./components/MainScreen";
import HomePage from "./components/HomePage";
import Login from "./components/login";
import Signup from "./components/signup";
const App = () => {
  return (
    <div>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/form" element={<FormComponent />} />

        <Route path="/main" element={<MainScreen />} />
        <Route path="/form" element={<FormComponent />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;
