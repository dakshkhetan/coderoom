import React from 'react';
import random from "random-key";
import './SideDrawer.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileExport } from '@fortawesome/free-solid-svg-icons';
import { database } from "firebase/app";
import { firebaseAuth } from "../../config/firebase-config";
import CloneSendPopup from '../ClonePopup/CloneSendPopup';
import CloneSendPopupSingle from '../ClonePopup/CloneSendPopupSingle';
import CloneReceivePopup from '../ClonePopup/CloneReceivePopup';

const clonesCreated = {};
const creatorInfo = {};
const usersList = [];
const newCloneSessionID = {};

export default class sideDrawer extends React.Component {

  constructor(props) {
    super(props);

    // setting initial state
    this.state = {
        cloneTrigger: random.generate(3),   // for triggering clone feature
        isCreator: false,
        clonePopupShow: false,
        clonePopupShowSingle: false,
    };

    this.sendSingleCloneHandler = this.sendSingleCloneHandler.bind(this);

  }

  // setting initial state
  state = {
    clonePopupShow: false,
    clonePopupShowSingle: false,
  };

  componentDidMount = () => {

    const session_id = this.props.session_id;
    var userConnectedRef = database().ref(`code-sessions/${session_id}/users-connected`);

    // to fetch currently signed-in user
    firebaseAuth().onAuthStateChanged(async (user) => {
      try {
        if (user) {

          var creator_uid;

          // fetch session creator's uid from database
          // const creator_uid = await database()
          await database()
          .ref(`code-sessions/${session_id}/creator`)
          .once("value")
          .then(snapshot => {
            var creatorData = snapshot.val();
            creator_uid = creatorData.user_id;
            creatorInfo.user_name = creatorData.user_name;
            creatorInfo.user_photo = creatorData.user_photo;
            // console.log(creatorData);
          })
          .catch(e => {
            // no session found corresponding to "sessionid" passed in the params
          });

          if (creator_uid === undefined ){
            // console.log("No Session Found!");
            return;
          }

          if (user.uid === creator_uid){
            // console.log("Current user is the session creator");
            this.setState({ isCreator: true });
          }

          // setting states of 'cloneTrigger' & 'isFirstLoad' in database
          database()
          .ref(`code-sessions/${session_id}/cloneHelper`)
          .update({
            cloneTrigger: this.state.cloneTrigger,
            isFirstLoad: true,
          });

          // setting states of 'cloneTrigger' & 'isFirstLoad' in database
          database()
          .ref(`code-sessions/${session_id}/singleCloneHelper`)
          .update({
            cloneTrigger: this.state.cloneTrigger,
            isFirstLoad: true,
          });

          // displaying users-connected from database
          database()
          .ref(`code-sessions/${session_id}/users-connected`)
          .on('value', snapshot => {
            clonesCreated.numOfClonesCreated = snapshot.numChildren();
            console.log("\nConnected users: ");
            usersList.splice(0, usersList.length);
            var i = 0;
            
            let self = this;
            let isCreator = this.state.isCreator;

            snapshot.forEach(function(childSnapshot){
              
              var userData = childSnapshot.val();
              console.log(userData.user_name + " - " + userData.user_email);
              // console.log(userData.cloneSessionID);

              let cloneLink;
              if(userData.cloneSessionID === undefined){
                cloneLink = `/404`;
              } else {
                cloneLink = `/home/${userData.cloneSessionID}`;
              }

              let displayUserNameCloneLink;
              if(isCreator){
                displayUserNameCloneLink = 
                <a 
                  href={cloneLink} 
                  target='_blank' 
                  rel='noopener noreferrer'>
                    {userData.user_name}
                </a>
              } else {
                displayUserNameCloneLink = 
                <span className="user-name">{userData.user_name}</span>
              }

              let sendSingleCloneButton;
              if(isCreator) {
                sendSingleCloneButton = 
                <span>
                  <button 
                    value={userData.user_id}
                    className="btn-sendClone single-clone-btn" 
                    onClick={self.sendSingleCloneHandler}>
                      <FontAwesomeIcon icon={faFileExport} />
                  </button>
                </span>
              }

              usersList.push(
                <li key={i}>
                  <span className="user-details-list">
                    <img src={userData.user_photo} alt="Avatar" />
                    { displayUserNameCloneLink }
                  </span>
                  { sendSingleCloneButton }
                </li>
              );
              i++;

            });
            console.log("\n");
          });

          // 'received-clone' pop-up handler
          if(!this.state.isCreator){
            // fetching and then setting state of 'clonePopupShow' from database
            database()
            .ref(`code-sessions/${session_id}/cloneHelper/clonePopupShow`)
            .on('value', snapshot => {
              // console.log("'clonePopupShow' state changed!");
              let clonePopupShowState = snapshot.val();
              if(clonePopupShowState){
                this.setState({
                  clonePopupShow: true,
                });
              }

              // setting state of 'clonePopupShow' to false in database
              // after delay of 500 milliseconds
              function clonePopupShowStateDelay(){
                database()
                .ref(`code-sessions/${session_id}/cloneHelper/clonePopupShow`)
                .set(false);
              }
              setTimeout(clonePopupShowStateDelay, 500);

            });

            // fetching and then setting state of 'clonePopupShow' from database
            database()
            .ref(`code-sessions/${session_id}/singleCloneHelper/clonePopupShow`)
            .on('value', snapshot => {
              // console.log("'clonePopupShow' state changed!");

              database()
              .ref(`code-sessions/${session_id}/singleCloneHelper`)
              .once("value")
              .then(snapshot => {
                let isFirstLoad = snapshot.val().isFirstLoad;

                // does not execute on first load of page
                if(isFirstLoad === false){
                  let user_uid = snapshot.val().user_uid;

                  if(user.uid === user_uid){

                    let clonePopupShowState = snapshot.val();
                    if(clonePopupShowState){
                      this.setState({
                        clonePopupShow: true,
                      });
                    }
    
                    // setting state of 'clonePopupShow' to false in database
                    // after delay of 500 milliseconds
                    function clonePopupShowStateDelay(){
                      database()
                      .ref(`code-sessions/${session_id}/singleCloneHelper/clonePopupShow`)
                      .set(false);
                    }
                    setTimeout(clonePopupShowStateDelay, 500);
    
                  }

                }

              })
              .catch(e => {
                console.log(e);
              });

            });

          }

          var date;

          // 'send-single-clone' button functionality
          // executes when 'send-single-clone' button is clicked
          // i.e. when 'cloneTrigger' key is changed in database
          database()
          .ref(`code-sessions/${session_id}/singleCloneHelper/cloneTrigger`)
          .on('value', snapshot => {

            database()
            .ref(`code-sessions/${session_id}/singleCloneHelper`)
            .once("value")
            .then(snapshot => {
              let isFirstLoad = snapshot.val().isFirstLoad;

              // does not execute on first load of page
              if(isFirstLoad === false){

                // console.log("sendSingleCloneButton clicked!");

                let user_uid = snapshot.val().user_uid;

                date = Date();

                // fetching existing code in this session ID to be cloned
                var existingContent;
                database()
                .ref(`code-sessions/${session_id}`)
                .once("value")
                .then(snapshot => {
                  existingContent = snapshot.val().content;
                })
                .catch(e => {
                  console.log(e);
                });

                // only creator can create new session with cloned code
                if(this.state.isCreator){

                  database()
                  .ref(`code-sessions/${session_id}/users-connected`)
                  .once("value")
                  .then(snapshot => {
                    // console.log("New clone being created.");

                    snapshot.forEach(function(childSnapshot){

                      // console.log(existingContent);

                      if(childSnapshot.val().user_id === user_uid){
                        let newSessionKey = random.generate(5);
                        let userData = childSnapshot.val();

                        // creating new session with cloned code
                        database()
                        .ref("code-sessions/" + newSessionKey)
                        .set({
                          cloneSentBy: creator_uid,
                          content: existingContent,
                          createdon: date,
                          readOnly: false,
                        });

                        // adding details of the user as creator to the database
                        database()
                        .ref("code-sessions/" + newSessionKey + "/creator")
                        .set({
                            user_id: userData.user_id,
                            user_name: userData.user_name,
                            user_email: userData.user_email,
                            user_photo: userData.user_photo
                        });

                        return true;
                      }
                      
                    });

                    console.log(`Clone sent!`);

                  })
                  .catch(e => {
                    console.log(e);
                  });
                }

                // finding new session id with cloned content
                // for currently signed-in user
                // and storing that session id in 'newCloneSessionID' object
                if(!this.state.isCreator){

                  // console.log(date);
                  // comparing date of session created exluding the 'seconds' time
                  var dateCompressed = date.substring(0, 21);

                  database()
                  .ref(`code-sessions/`)
                  .once("value")
                  .then(snapshot => {
                    snapshot.forEach(function(childSnapshot){

                      console.clear();
                      console.log("Searching...");

                      let cloneSentBy = childSnapshot.child("cloneSentBy").val();
                      let user_id = childSnapshot.child("creator").child("user_id").val();
                      let content = childSnapshot.child("content").val();
                      let createdOn = childSnapshot.child("createdon").val();
                      let createdOnCompressed = createdOn.substring(0, 21);

                      // Comparing: content (code), user id (uid), 
                      //    cloneSentBy (creator id), date (createOn)
                      if(cloneSentBy === creator_uid 
                        && user_id === user.uid
                        && content === existingContent
                        && createdOnCompressed === dateCompressed) {
                        
                        let cloneSessionID = childSnapshot.key;
                        newCloneSessionID.session_id = cloneSessionID;

                        console.log(`Clone found at session ID: ${cloneSessionID}`);

                        userConnectedRef
                        .once("value")
                        .then(snapshot => {
                          snapshot.forEach(function(childSnapshot){
                            let user_id = childSnapshot.val().user_id;
                            if(user_id === user.uid) {
                              console.log(`User details stored under "${childSnapshot.key}" in database`);
                              database()
                              .ref(`code-sessions/${session_id}/users-connected/${childSnapshot.key}`)
                              .update({
                                cloneSessionID: cloneSessionID
                              });
                              return true;
                            }
                          });
                        })
                        .catch(e => {
                          console.log(e);
                        });
                       
                        return true;
                      }

                    });

                  });
                }

              }

            })
            .catch(e => {
              console.log(e);
            });

          });

          // 'send-clone' button functionality
          // executes when 'send-clone' button is clicked
          // i.e. when 'cloneTrigger' key is changed in database
          database()
          .ref(`code-sessions/${session_id}/cloneHelper/cloneTrigger`)
          .on('value', snapshot => {

            database()
            .ref(`code-sessions/${session_id}/cloneHelper`)
            .once("value")
            .then(snapshot => {
              let isFirstLoad = snapshot.val().isFirstLoad;

              // does not execute on first load of page
              if(isFirstLoad === false){

                // console.log("sendCloneButton clicked!");

                date = Date();

                // fetching existing code in this session ID to be cloned
                var existingContent;
                database()
                .ref(`code-sessions/${session_id}`)
                .once("value")
                .then(snapshot => {
                  existingContent = snapshot.val().content;
                })
                .catch(e => {
                  console.log(e);
                });

                // only creator can create new sessions with cloned code
                if(this.state.isCreator){

                  database()
                  .ref(`code-sessions/${session_id}/users-connected`)
                  .once("value")
                  .then(snapshot => {
                    // console.log("New clone being created.");

                    snapshot.forEach(function(childSnapshot){
                      
                      // console.log(existingContent);
                      let newSessionKey = random.generate(5);
                      let userData = childSnapshot.val();

                      // creating new session with cloned code
                      database()
                      .ref("code-sessions/" + newSessionKey)
                      .set({
                        cloneSentBy: creator_uid,
                        content: existingContent,
                        createdon: date,
                        readOnly: false,
                      });

                      // adding details of the user as creator to the database
                      database()
                      .ref("code-sessions/" + newSessionKey + "/creator")
                      .set({
                          user_id: userData.user_id,
                          user_name: userData.user_name,
                          user_email: userData.user_email,
                          user_photo: userData.user_photo
                      });
                      
                    });

                    // setting 'numOfClonesCreated' to be passed in props of 'CloneSendPopup'
                    clonesCreated.numOfClonesCreated = snapshot.numChildren();
                    console.log(`Created ${snapshot.numChildren()} clone(s)`);

                  })
                  .catch(e => {
                    console.log(e);
                  });
                }

                // finding new session id with cloned content
                // for currently signed-in user
                // and storing that session id in 'newCloneSessionID' object
                if(!this.state.isCreator){

                  // console.log(date);
                  // comparing date of session created exluding the 'seconds' time
                  var dateCompressed = date.substring(0, 21);

                  database()
                  .ref(`code-sessions/`)
                  .once("value")
                  .then(snapshot => {

                    snapshot.forEach(function(childSnapshot){

                      console.clear();
                      console.log("Searching...");

                      let cloneSentBy = childSnapshot.child("cloneSentBy").val();
                      let user_id = childSnapshot.child("creator").child("user_id").val();
                      let content = childSnapshot.child("content").val();
                      let createdOn = childSnapshot.child("createdon").val();
                      let createdOnCompressed = createdOn.substring(0, 21);

                      // Comparing: content (code), user id (uid), 
                      //    cloneSentBy (creator id), date (createOn)
                      if(cloneSentBy === creator_uid 
                        && user_id === user.uid
                        && content === existingContent
                        && createdOnCompressed === dateCompressed) {
                        
                        let cloneSessionID = childSnapshot.key;
                        newCloneSessionID.session_id = cloneSessionID;
                        console.log(`Clone found at session ID: ${cloneSessionID} \n`);

                        userConnectedRef
                        .once("value")
                        .then(snapshot => {
                          snapshot.forEach(function(childSnapshot){
                            let user_id = childSnapshot.val().user_id;
                            if(user_id === user.uid) {
                              console.log(`User details stored under "${childSnapshot.key}" in database`);
                              database()
                              .ref(`code-sessions/${session_id}/users-connected/${childSnapshot.key}`)
                              .update({
                                cloneSessionID: cloneSessionID
                              });
                              return true;
                            }
                          });
                        })
                        .catch(e => {
                          console.log(e);
                        });
                       
                        return true;
                      }
                    });

                  });
                }

              }

            })
            .catch(e => {
              console.log(e);
            });

          });

        } else {
          console.log("Cannot fetch currently signed-in user!");
        }
      } catch(error) {
        console.log("Error in authentication:", error);
      }
    });

    this.codeRef = database().ref(`code-sessions/${session_id}`);

  };

  // single user 'send-clone' button handler
  sendSingleCloneHandler = (e) => {

    let user_uid = e.currentTarget.value;
    // console.log(user_uid);

    let newCloneTrigger = random.generate(3);
    this.setState({
      clonePopupShowSingle: true,
      cloneTrigger: newCloneTrigger,
    });

    // adding corresponding user uid into database
    this.codeRef.child("singleCloneHelper").child("user_uid").set(user_uid);
    // setting 'isFirstLoad' to false in database
    this.codeRef.child("singleCloneHelper").child("isFirstLoad").set(false);
    // setting 'clonePopupShow' state to true in database
    this.codeRef.child("singleCloneHelper").child("clonePopupShow").set(true);
    // updating 'cloneTrigger' value and 'clonePopupShow' state in database
    // indicating 'send-clone' button is clicked
    this.codeRef.child("singleCloneHelper").child("cloneTrigger").set(newCloneTrigger);

  };

  // 'send-clone' button handler
  sendCloneHandler = () => {
    let newCloneTrigger = random.generate(3);
    this.setState({
      clonePopupShow: true,
      cloneTrigger: newCloneTrigger,
    });
    // setting 'isFirstLoad' to false in database
    this.codeRef.child("cloneHelper").child("isFirstLoad").set(false);
    // setting 'clonePopupShow' state to true in database
    this.codeRef.child("cloneHelper").child("clonePopupShow").set(true);
    // updating 'cloneTrigger' value and 'clonePopupShow' state in database
    // indicating 'send-clone' button is clicked
    this.codeRef.child("cloneHelper").child("cloneTrigger").set(newCloneTrigger);
  };

  render() {

    // 'send-clone' button is only displayed when current user is the creator of session
    let sendCloneButton;
    if (this.state.isCreator) {
      sendCloneButton = 
      <span className="heading">
        <button 
          className="btn-sendClone" 
          onClick={this.sendCloneHandler}>
            {/* <FontAwesomeIcon icon={faFileExport} /> */}
            <span>Send Clone To All</span>
        </button>
      </span>
    }

    // to close the send/receive clone popup
    let clonePopupClose = () => {
      this.setState({clonePopupShow: false});
      this.setState({clonePopupShowSingle: false});
    }

    let clonePopUp;
    if (!this.state.isCreator) {
      // render 'clone-received' pop-up component
      clonePopUp = 
        <CloneReceivePopup 
          show={this.state.clonePopupShow}
          onHide={clonePopupClose} 
        />
    } else {
      // render 'clone-sent' pop-up component
      clonePopUp = 
        <CloneSendPopup 
          num={clonesCreated.numOfClonesCreated}
          show={this.state.clonePopupShow}
          onHide={clonePopupClose} 
        />
    }

    let singleClonePopUp;
    if (this.state.isCreator) {
      // render 'clone-sent' pop-up (for single user) component
      singleClonePopUp = 
        <CloneSendPopupSingle 
          show={this.state.clonePopupShowSingle}
          onHide={clonePopupClose} 
        />
    }
    
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

        { sendCloneButton }

        <span className="heading">
            Connected Users:
        </span>

        { clonePopUp }
        { singleClonePopUp }

        <div className="divider" />
        <ul>
          { usersList }
        </ul>
      </nav>
    );
  }

}

// exporting new session ID with cloned code to each user-connected
export {newCloneSessionID};