import React, { Component } from 'react';
import { Modal, Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './CloneSendPopup.css';

export default class CloneSendPopup extends Component {    

    render(){

        return (
            <Modal
            {...this.props}
            size="sm"
            aria-labelledby="contained-modal-title-vcenter"
            centered
            >

                <Modal.Header closeButton>
                    <Modal.Title id="contained-modal-title-vcenter">
                        Clone sent!
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <div className="popup-heading" >
                            Created {this.props.num} clone(s).
                    </div>
                </Modal.Body>
                
                <Modal.Footer>
                    <Button variant="danger" onClick={this.props.onHide}>
                        Close
                    </Button>
                </Modal.Footer>

            </Modal>
        );
    }

}