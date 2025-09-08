// import React from "react";
// import { Routes, Route, Navigate } from "react-router-dom";
// import FormComponent from "./components/FormComponent";
// import MainScreen from "./components/MainScreen";
// import HomePage from "./components/HomePage";
// import Login from "./components/login";
// import Signup from "./components/signup";
// import InterviewPrepPage from "./components/InterviewPrep";
// const App = () => {
//   return (
//     <div>
//       <Routes>
//         <Route path="/" element={<HomePage />} />
//         <Route path="/form" element={<FormComponent />} />
//         <Route path="/interview-prep" element={<InterviewPrepPage />} />
//         <Route path="/main" element={<MainScreen />} />
//         <Route path="/form" element={<FormComponent />} />
//         <Route path="/login" element={<Login />} />
//         <Route path="/signup" element={<Signup />} />

//         {/* Redirect unknown routes to home */}
//         <Route path="*" element={<Navigate to="/" replace />} />
//       </Routes>
//     </div>
//   );
// };

// export default App;

//-----------------------------

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import FormComponent from "./components/FormComponent";
import HomePage from "./components/HomePage";
import Login from "./components/login";
import Signup from "./components/signup";

// Import the new Layout component and page components
import Layout from "./components/Layout";
import InterviewPrep from "./components/InterviewPrep";
import MainScreen from "./components/MainScreen";
const App = () => {
  return (
    <div>
      <Routes>
        {/* Public routes (without sidebar) */}
        <Route path="/" element={<HomePage />} />
        <Route path="/form" element={<FormComponent />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Dashboard routes (with persistent sidebar) */}
        <Route path="/main" element={<Layout />}>
          <Route index element={<MainScreen />} />
          {/* <Route index element={<MainScreen />} />
          <Route path="matches" element={<MainScreen />} /> */}
          <Route path="interview-prep" element={<InterviewPrep />} />
          {/* <Route path="saved" element={<Saved />} />
          <Route path="applied" element={<Applied />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} /> */}
        </Route>

        {/* Legacy route - redirect old interview prep page */}
        <Route
          path="/interview-prep"
          element={<Navigate to="/main/interview-prep" replace />}
        />

        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;
