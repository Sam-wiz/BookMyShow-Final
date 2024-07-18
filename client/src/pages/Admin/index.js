import React from 'react';
import { Tabs, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import MovieList from './MovieList';
import TheatresTable from './TheatresTable';
import MovieFrom from './MovieForm';

function Admin() {
  const navigate = useNavigate();

  const checkUser = async () => {
    try {
      const user = await axios.get("/api/users/get-current-user", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      console.log(user.data.data);
      if (!user) {
        navigate("/admin");
      }

      if (user.data.data.role === "partner") {
        navigate("/partner");
        message.error("You are not allowed to access this page");
      } else if (user.data.data.role === "user") {
        navigate("/");
        message.error("You are not allowed to access this page");
      } else {
        navigate("/admin");
      }
    } catch (error) {
      console.error("Error checking user role:", error);
      message.error("An error occurred while checking the user role");
    }
  };

  checkUser();

  const tabItems = [
    {
      key: '1',
      label: 'Movies',
      children: <MovieList />
    },
    {
      key: '2',
      label: 'Theatres',
      children: <TheatresTable />
    }
  ];

  return (
    <div>
      <h1>Admin Page</h1>
      <Tabs items={tabItems} />
    </div>
  );
}

export default Admin;
