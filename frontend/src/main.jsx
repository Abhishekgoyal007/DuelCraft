// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import router from "./router";
import "./index.css";

import { AuthProvider } from "./context/AuthContext";
import { Web3Provider } from "./context/Web3Context";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <Web3Provider>
        <RouterProvider router={router} />
      </Web3Provider>
    </AuthProvider>
  </React.StrictMode>
);
