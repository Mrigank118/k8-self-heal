import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const BackendWatcher = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch("http://<your-k8s-service>/healthz", {
          method: "GET",
        });
        if (!res.ok && location.pathname !== "/backend-down") {
          navigate("/backend-down");
        }
        if (res.ok && location.pathname === "/backend-down") {
          navigate("/");
        }
      } catch {
        if (location.pathname !== "/backend-down") {
          navigate("/backend-down");
        }
      }
    };

    const id = setInterval(checkHealth, 3000);
    return () => clearInterval(id);
  }, [navigate, location.pathname]);

  return null;
};

export default BackendWatcher;
