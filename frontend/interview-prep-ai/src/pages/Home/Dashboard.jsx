import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LuPlus } from "react-icons/lu"; // Assuming LuPlus is imported from react-icons/lu
import DashboardLayout from "../../components/Layouts/DashboardLayout"; // Adjust the path as needed
import axiosInstance from "../../utils/axiosinstance";
import { API_PATHS } from "../../utils/apiPaths";
import moment from "moment";
import { CARD_BG } from "../../utils/data";
import toast from "react-hot-toast";
import SummaryCard from "../../components/Cards/SummaryCard";
import CreateSessionForm from "./CreateSessionForm";
import Modal from "../../components/Modal";
const Dashboard = () => {
  const navigate = useNavigate();

  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [openDeleteAlert, setOpenDeleteAlert] = useState({
    open: false,
    data: null,
  });

  // Placeholder for fetchAllSessions - you would implement the actual API call here
  const fetchAllSessions = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.SESSION.GET_ALL);
      setSessions(response.data);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast.error("Failed to fetch sessions.");
    }
    console.log("Fetching all sessions...");
    // Mock data for demonstration
  };

  // Placeholder for deleteSession - you would implement the actual API call here
  const deleteSession = async (sessionId) => {
    try {
      await axiosInstance.delete(API_PATHS.SESSION.DELETE(sessionId));
      toast.success("Session deleted successfully!");
      fetchAllSessions();
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error("Failed to delete session.");
    }
  };

  useEffect(() => {
    fetchAllSessions();
  }, []);

  return (
    <DashboardLayout>
      <div className="container mx-auto pt-4 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-7 pt-1 pb-6 mt-4 mb-6 ml-4 mr-4">
          {sessions?.map((data, index) => (
            <SummaryCard
              key={data?._id}
              colors={CARD_BG[index % CARD_BG.length]}
              role={data?.role || ""}
              topicsToFocus={data?.topicsToFocus || ""}
              experience={data?.experience || "-"}
              questions={data?.questions?.length || "-"}
              description={data?.description || ""}
              lastUpdated={
                data?.updatedAt
                  ? moment(data.updatedAt).format("DD MMM YYYY")
                  : ""
              }
              onSelect={() => navigate(`/interview-prep/${data?._id}`)}
              onDelete={() => deleteSession(data._id)}
            />
          ))}
        </div>

        {/* Floating Add New Button */}
        <button
          className="fixed bottom-8 right-8
                     h-12 w-fit px-6 rounded-full
                     flex items-center justify-center gap-3
                     bg-gradient-to-r from-blue-500 to-blue-700
                     text-white font-semibold shadow-lg
                     hover:from-blue-600 hover:to-blue-800
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
                     transition duration-300 ease-in-out"
          onClick={() => setOpenCreateModal(true)}
        >
          <LuPlus className="text-2xl" />
          Add New
        </button>
      </div>

      <Modal
        isOpen={openCreateModal}
        onClose={() => {
          setOpenCreateModal(false);
        }}
        hideHeader
      >
        <div>
          <CreateSessionForm onClose={() => setOpenCreateModal(false)} />
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default Dashboard;
