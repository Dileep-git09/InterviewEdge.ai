import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import DashboardLayout from "../../components/Layouts/DashboardLayout";
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
  const [isDeleting, setIsDeleting] = useState(false);

  // openDeleteAlert holds { open: bool, data: session object | null }
  const [openDeleteAlert, setOpenDeleteAlert] = useState({
    open: false,
    data: null,
  });

  const fetchAllSessions = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.SESSION.GET_ALL);
      setSessions(response.data);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast.error("Failed to fetch sessions.");
    }
  };

  // Called when the user clicks the trash icon on a card.
  // Opens the confirmation dialog instead of deleting immediately.
  const handleDeleteClick = (session) => {
    setOpenDeleteAlert({ open: true, data: session });
  };

  // Called only after the user confirms inside the dialog.
  const handleConfirmDelete = async () => {
    if (!openDeleteAlert.data) return;
    setIsDeleting(true);
    try {
      await axiosInstance.delete(
        API_PATHS.SESSION.DELETE(openDeleteAlert.data._id)
      );
      toast.success("Session deleted successfully!");
      setOpenDeleteAlert({ open: false, data: null });
      fetchAllSessions();
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error("Failed to delete session.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setOpenDeleteAlert({ open: false, data: null });
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
              // Pass the whole session object so we can show its name in the dialog
              onDelete={() => handleDeleteClick(data)}
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

      {/* Create session modal */}
      <Modal
        isOpen={openCreateModal}
        onClose={() => setOpenCreateModal(false)}
        hideHeader
      >
        <div>
          <CreateSessionForm onClose={() => setOpenCreateModal(false)} />
        </div>
      </Modal>

      {/* ── Delete confirmation dialog ─────────────────────────────────────── */}
      <Modal
        isOpen={openDeleteAlert.open}
        onClose={handleCancelDelete}
        title="Delete Session"
      >
        <div className="flex flex-col items-center text-center gap-4 py-2">
          {/* Warning icon */}
          <div className="w-14 h-14 flex items-center justify-center rounded-full bg-red-100 text-red-500">
            <LuTrash2 size={26} />
          </div>

          {/* Message */}
          <div>
            <p className="text-gray-800 font-medium text-base">
              Delete &quot;{openDeleteAlert.data?.role}&quot; session?
            </p>
            <p className="text-gray-500 text-sm mt-1">
              This will permanently remove the session and all{" "}
              <span className="font-medium text-gray-700">
                {openDeleteAlert.data?.questions?.length || 0} question
                {openDeleteAlert.data?.questions?.length !== 1 ? "s" : ""}
              </span>{" "}
              inside it. This action cannot be undone.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 w-full mt-1">
            <button
              onClick={handleCancelDelete}
              disabled={isDeleting}
              className="flex-1 py-2 rounded-md border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="flex-1 py-2 rounded-md bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Yes, Delete"}
            </button>
          </div>
        </div>
      </Modal>
      {/* ─────────────────────────────────────────────────────────────────── */}
    </DashboardLayout>
  );
};

export default Dashboard;