import React, { Component } from "react";
import { Modal, Button } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "./CloneReceivePopup.css";
import { creatorInfo } from "../../containers/pages/Coding";
import { newCloneSessionID } from "../SideDrawer/SideDrawer";

export default class CloneReceivePopup extends Component {
  render() {
    var session_id = newCloneSessionID.session_id;

    return (
      <Modal
        {...this.props}
        size="lg"
        aria-labelledby="contained-modal-title-vcenter"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title id="contained-modal-title-vcenter">
            Copy received from {creatorInfo.user_name}!
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div className="popup-heading">
            Your key for the cloned session is :
            <a
              href={`/home/${session_id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {session_id}
            </a>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="danger" onClick={this.props.onHide}>
            Close
          </Button>
          <Button variant="dark" href={`/home/${session_id}`} target="_blank">
            Open
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
}
