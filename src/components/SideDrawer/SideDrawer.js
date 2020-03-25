import React from 'react';
import './SideDrawer.css';
import { creatorInfo } from '../../containers/pages/Coding';
import { usersList } from '../../containers/pages/Coding';

export default class sideDrawer extends React.Component {

  render() {
    
    let drawerClasses = 'side-drawer';

    if (this.props.show) {
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
  }

}