// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import router from "./router";
import "./index.css";

import { AuthProvider } from "./context/AuthContext";
import { Web3Provider } from "./context/Web3Context";
import { ToastProvider } from "./context/ToastContext";
import { TutorialProvider } from "./components/Tutorial";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <Web3Provider>
        <ToastProvider>
          <TutorialProvider>
            <RouterProvider router={router} />
          </TutorialProvider>
        </ToastProvider>
      </Web3Provider>
    </AuthProvider>
  </React.StrictMode>
);
