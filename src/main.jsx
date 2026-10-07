import React from "react";
import { createRoot } from "react-dom/client";
import PublicAppV2 from "./PublicAppV2.jsx";
import CreatorStudioV2 from "./CreatorStudioV2.jsx";
import "./styles.css";

const params=new URLSearchParams(window.location.search);
const isAdmin = ["/admin","/admin/","/admin.html"].includes(window.location.pathname) || params.get("admin")==="1";
if(params.get("admin")==="1" && window.location.pathname==="/"){params.delete("admin");window.location.replace("/admin.html"+(params.size?"?"+params.toString():""))}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isAdmin ? <CreatorStudioV2 /> : <PublicAppV2 />}
  </React.StrictMode>
);
