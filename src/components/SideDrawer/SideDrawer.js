import React from 'react';

import './SideDrawer.css';
import { usersList } from '../../containers/pages/Coding';
import { creatorInfo } from '../../containers/pages/Coding';

const sideDrawer = props => {

  let drawerClasses = 'side-drawer';

  if (props.show) {
    drawerClasses = 'side-drawer open';
  }
  
  return (
    <nav className={drawerClasses}>
      <span className="heading">
          Session Creator:
      </span>
      <div className="divider" />
      <div className="creator-info">
        <img src={creatorInfo.user_photo} alt="Avatar" />
        <span>{creatorInfo.user_name}</span>
      </div>
      <div className="divider-thick" />
      <span className="heading">
          Connected Users:
      </span>
      <div className="divider" />
      <ul>
        { usersList }
      </ul>
    </nav>
  );
};

export default sideDrawer;