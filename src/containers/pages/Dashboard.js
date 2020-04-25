import React from "react";
import Header from "../../components/Header/Header";
import { database } from "firebase/app";
import { firebaseAuth } from "../../config/firebase-config";
import { logout } from "../../helpers/auth";

const appTokenKey = "appToken";
const sessionID = "sessionID";
const userSessionsList = [];
const sessionClonesList = [];
const userDisplayName = {};

export default class Dashboard extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      helper: true,
      isLoadingUserSession: true,
      viewClonesHelpText: false,
      isLoadingSessionClones: false,
      noSessionFoundText: false,
      noCloneFoundText: false,
    };

    if (localStorage.getItem(sessionID)){
      localStorage.removeItem(sessionID);
    }

    if (!localStorage.getItem(appTokenKey)) {
        this.props.history.push(`/login`);
        return;
    }

    this.handleLogout = this.handleLogout.bind(this);
    this.viewClonesHandler = this.viewClonesHandler.bind(this);
  }

  componentDidMount = () => {

    // to fetch currently signed-in user
    firebaseAuth().onAuthStateChanged(user => {
      try {
        if (user) {

          // storing current user's name
          userDisplayName.name = user.displayName;

          // to reset/hide the session clones list whenever dashboard page is opened
          sessionClonesList.splice(0, sessionClonesList.length);

          // database().ref(`/${session_id}/creator`).orderByChild("user_id").equalTo(user.uid).on('value', function (snapshot) {});

          database()
          .ref(`code-sessions/`)
          .once("value")
          .then(snapshot => {
            // console.log("Searching for all sessions created by current user...");
            userSessionsList.splice(0, userSessionsList.length);
            let found = false;
            let self = this;
            let i = 0;

            snapshot.forEach(function(childSnapshot){

              let creator_id = childSnapshot.child("creator").child("user_id").val();
              let sessionsTitle = childSnapshot.child("title").val();
              let createdOn = childSnapshot.child("createdon").val();
              let createdOnCompressed = createdOn.substring(0, 24);

              if(creator_id === user.uid) {

                self.setState({
                  isLoadingUserSession: false,
                  viewClonesHelpText: true,
                });

                found = true;

                let sessionid = childSnapshot.key;
                // console.log(`User session id: ${sessionid}`);

                userSessionsList.push(
                  <tr key={i}>
                    <td>
                      <a href={`/home/${sessionid}`} target='_blank' rel="noopener noreferrer">
                        {sessionid}
                      </a>
                    </td>
                    <td>
                      <a className="title-color" 
                        href={`/home/${sessionid}`} 
                        target='_blank' rel="noopener noreferrer">
                          { sessionsTitle }
                      </a>
                    </td>
                    <td>{ createdOnCompressed }</td>
                    <td>
                      <button 
                        className="view-clone-btn"
                        value={sessionid}
                        onClick={self.viewClonesHandler}>
                          View Clones
                      </button>
                    </td>
                  </tr>
                );
                i++;

                self.setState(self.state);

              }
            });

            if(!found){
              this.setState({
                isLoadingUserSession: false,
                noSessionFoundText: true,
              });
              // console.log("No clones found!");
            }

            // this.setState(this.state);
          });

        } else {

          console.log("Cannot fetch currently signed-in user!");
          console.log("Signing out... please login again.");
          if (localStorage.getItem(appTokenKey)) {
            // localStorage.setItem("sessionID", session_id);
            logout().then(function () {
              localStorage.removeItem(appTokenKey);
              this.props.history.push("/login");
            }.bind(this));
            return;
          }

        }
      } catch(error) {
        console.log("Error in authentication:", error);
      }
    });
  }

  viewClonesHandler = (e) => {

    this.setState({
      viewClonesHelpText: false,
      isLoadingSessionClones: true,
      noCloneFoundText: false,
    });

    sessionClonesList.splice(0, sessionClonesList.length);

    let correspondingSessionID = e.currentTarget.value;
    // console.log(`correspondingSessionID: ${correspondingSessionID}`);

    database()
    .ref(`code-sessions/`)
    .once("value")
    .then(snapshot => {

      // sessionClonesList.splice(0, sessionClonesList.length);
      let found = false;
      let self = this;
      let i = 0;

      snapshot.forEach(function(childSnapshot){

        let clonedFromSessionID = childSnapshot.child("clonedFromSession").val();
        let userName = childSnapshot.child("creator").child("user_name").val();
        let userEmail = childSnapshot.child("creator").child("user_email").val();
        let createdOn = childSnapshot.child("createdon").val();
        let createdOnCompressed = createdOn.substring(0, 24);

        if(clonedFromSessionID === correspondingSessionID) {
          self.setState({isLoadingSessionClones: false});
          found = true;
          let cloneSesssionID = childSnapshot.key;
          // console.log(`cloneSesssionID: ${cloneSesssionID}`);

          sessionClonesList.push(
            <tr key={i}>
              <td>
                <a href={`/home/${cloneSesssionID}`} 
                  target='_blank' rel="noopener noreferrer">
                    {cloneSesssionID}
                </a>
              </td>
              <td>
                <span className="title-color">{ userName }</span>
              </td>
              <td>{ userEmail }</td>
              <td>{ createdOnCompressed }</td>
            </tr>
          );
          i++;

          self.setState(self.state);
        }

      });

      if(!found){
        this.setState({
          isLoadingSessionClones: false,
          noCloneFoundText: true,
        });
        // console.log("No clones found!");
      }

      this.setState(this.state);

    });
  };

  // sign-out functionality
  handleLogout() {
    logout().then(function () {
        localStorage.removeItem(appTokenKey);
        localStorage.removeItem(sessionID);
        this.props.history.push("/login");
        console.log("User signed-out from firebase.");
    }.bind(this));
  }

  render() {

    let loadingTextUserSession;
    if(this.state.isLoadingUserSession){
      loadingTextUserSession = <span className="loading-text">Loading...</span>;
    }

    let loadingTextSessionClones;
    if(this.state.isLoadingSessionClones){
      loadingTextSessionClones = <span className="loading-text">Loading...</span>;
    }

    let viewClonesHelpText;
    if(!this.state.isLoadingUserSession && this.state.viewClonesHelpText){
      viewClonesHelpText = 
      <span className="view-clones-help-text">(Click on the 'View Clones' button 
        corresponding to a session ID above)</span>;
    }

    let noCloneFoundText;
    if(this.state.noCloneFoundText){
      noCloneFoundText = 
      <span className="view-clones-help-text">No Clones Found!</span>;
    }

    let noSessionFoundText;
    if(this.state.noSessionFoundText){
      noSessionFoundText = 
      <span className="view-clones-help-text">No Sessions Found!</span>;
    }

    let usersSessionHeading;
    let usersCloneHeading;
    if(userDisplayName.name !== undefined){
      let name = userDisplayName.name;
      usersSessionHeading = name + "'s sessions";
      usersCloneHeading = "Session clones";
    }

    return (
      <React.Fragment>
        <Header
          style={{ background: "#000000" }}
          extras={
            <div>
              Dashboard
              <button className="btn-coding margin-l-20 padding-0-14" onClick={this.handleLogout}>
                Sign Out
              </button>
            </div>
          }
        />
        <div className="dashboard">
          <p className="sessions-title">
            { usersSessionHeading }
          </p>
          <table className="table-collection">
            <thead>
              <tr>
                <th>Session ID</th>
                <th>Title</th>
                <th>Created On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              { userSessionsList }
            </tbody>
          </table>
          { loadingTextUserSession }
          { noSessionFoundText }
          <p className="clones-title">
            { usersCloneHeading }
          </p>
          <table className="table-collection">
            <thead>
              <tr>
                <th>Session ID</th>
                <th>Sent To</th>
                <th>Email</th>
                <th>Created On</th>
              </tr>
            </thead>
            <tbody>
              { sessionClonesList }
            </tbody>
          </table>
          { viewClonesHelpText }
          { loadingTextSessionClones }
          { noCloneFoundText }
        </div>
      </React.Fragment>
    );
  }
  
}