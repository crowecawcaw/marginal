import React from 'react';
import IconBar from '../IconBar/IconBar';
import Sidebar from '../Sidebar/Sidebar';
import EditorArea from '../EditorArea/EditorArea';
import './Layout.css';

const Layout: React.FC = () => {
  return (
    <div className="layout">
      <IconBar />
      <Sidebar />
      <EditorArea />
    </div>
  );
};

export default Layout;
