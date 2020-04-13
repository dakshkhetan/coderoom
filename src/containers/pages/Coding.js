import React from "react";
import random from "random-key";
import Header from "../../components/Header/Header";
import SideDrawer from '../../components/SideDrawer/SideDrawer';
import Backdrop from '../../components/Backdrop/Backdrop';
import { database } from "firebase/app";
import { firebaseAuth } from "../../config/firebase-config";
import { logout } from "../../helpers/auth";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import { faToggleOn, faToggleOff } from '@fortawesome/free-solid-svg-icons';

const appTokenKey = "appToken";
const sessionID = "sessionID";
const creatorInfo = {};

export default class CodingPage extends React.Component {

  constructor(props) {
      super(props);

      const session_id = this.props.match.params.sessionid;

      // if appTokenKey is not found in localStorage,
      // then redirect to login page
      if (!localStorage.getItem(appTokenKey)) {
        localStorage.setItem("sessionID", session_id);
        this.props.history.push(`/login`);
        return;
      }

      // setting initial state
      this.state = {
          key: random.generate(3), // for storing connected-users
          readOnly: false,
          isCreator: false,
          sideDrawerOpen: false,
          mode: 'xml',
          code: "Loading...",
          cursorPosition: {
            line: 0,
            ch: 0
          },
      };

      // set 'readOnly' state from database
      database()
      .ref(`code-sessions/${session_id}`)
      .once("value")
      .then(snapshot => {
        var readOnly = snapshot.val().readOnly;
        this.setState({ readOnly: readOnly });
      })
      .catch(e => {
        // no session found corresponding to "sessionid" passed in the params
      });

      this.handleLogout = this.handleLogout.bind(this);

  }

  // setting initial state
  state = {
    sideDrawerOpen: false,
    mode: 'xml',
    code: "Loading...",
    cursorPosition: {
      line: 0,
      ch: 0
    },
  };

  componentDidMount = () => {

    const { params } = this.props.match;
    const session_id = params.sessionid;

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
            console.log("No Session Found!");
            return;
          }

          // do not add user details to 'users-connected'
          // if that user is the creator of session
          if (user.uid !== creator_uid){

              console.log("Current user is NOT the session creator");
              console.log("User added to 'users-connected'");
              
              var newUser;

              // checking if user already present in database
              await database()
              .ref(`code-sessions/${session_id}/users-connected`)
              .once("value")
              .then(snapshot => {
                snapshot.forEach(function(childSnapshot){
                  var userData = childSnapshot.val();
                  if(userData.user_id === user.uid){
                    newUser = false;
                    console.log("User details already present in the database");
                  }
                });
                if(newUser !== false){
                  newUser = true;
                }
              })
              .catch(e => {
                console.log(e);
              });

              // adding new user details in database
              if(newUser === true){
                console.log("User details added to the database");
                await database()
                .ref(`code-sessions/${session_id}/users-connected/user-` + this.state.key)
                .set({
                  user_id: user.uid,
                  user_name: user.displayName,
                  user_email: user.email,
                  user_photo: user.photoURL
                });
              }

          } else {
            console.log("Current user is the session creator");
            console.log("User NOT added to 'users-connected'");
            this.setState({ isCreator: true });
          }

          // making the users-editing-state button dynamic
          database()
          .ref(`code-sessions/${session_id}`)
          .on('value', snapshot => {
            // console.log("readOnly changed!");
            if(this.userEditingToggleBtn !== null){
              let readOnlyState = snapshot.val().readOnly;
              if(readOnlyState){
                this.userEditingToggleBtn.innerHTML = "Editing: Disabled";
              } else {
                this.userEditingToggleBtn.innerHTML = "Editing: Enabled";
              }
            }
          });

        } else {

          console.log("Cannot fetch currently signed-in user!");
          console.log("Signing out... please login again.");
          if (localStorage.getItem(appTokenKey)) {
            localStorage.setItem("sessionID", session_id);
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

    this.firepadRef = database().ref(`code-sessions/${session_id}/firepad`);

    this.codemirror = window.CodeMirror(this.firepadDiv, {
      mode: this.state.mode,
      theme: "dracula",
      lineNumbers: true,
      lineWrapping: true,
      autoCloseTags: true,
      matchBrackets: true,
      autoCloseBrackets: true,
      matchTags: true,
      showTrailingSpace: true,
      extraKeys: {
          'Ctrl-Space' : 'autocomplete',
          'Cmd-/' : 'toggleComment',
          'Ctrl-/' : 'toggleComment'
      },
    });

    this.firepad = window.Firepad.fromCodeMirror(this.firepadRef, this.codemirror, {
        // richTextShortcuts: true,
        // richTextToolbar: true,
        // defaultText: "Loading...",
    });

    database()
    .ref(`code-sessions/${session_id}/firepad/history`)
    // .orderByKey()
    .on("value", snapshot => {
        // console.log("Number of revisions:", snapshot.numChildren());
        let count = 0;
        // keeping record (history) of last 150 changes in database
        if(snapshot.numChildren() > 150){
            let minCount = snapshot.numChildren() - 150;
            snapshot.forEach(function(childSnapshot){
                if(count === minCount){
                    return true;
                }
                // console.log("Deleted! " + count + " " + childSnapshot.key);
                childSnapshot.ref.remove();
                count++;
            });
        }

        database()
        .ref(`code-sessions/${session_id}/firepad/history`)
        .once("value")
        .then(snapshot => {
            // console.log("New number of revisions:", snapshot.numChildren());
        });

    });

    let self = this;
    database()
    .ref(`code-sessions/${session_id}`)
    .once("value")
    .then(snapshot => {

      // trimmimg the Date() to remove unnecessary add-ons
      var createdOn = snapshot.val().createdon;
      var createdOnCompressed = createdOn.substring(0, 25);
      self.setState({ 
        code: snapshot.val().content + "", 
        createdon: createdOnCompressed 
      });

      /**** TODO: ****/
      // this.codemirror.setValue("Loading...");
      // this.codemirror.setValue("");

      this.firepad.on('ready', function() {
        if (self.firepad.isHistoryEmpty()) {
            self.firepad.setText(self.state.code);
        }
        // self.firepad.setUserId(userId)
      });

      // called whenever changes are made in editor
      this.firepad.on('synced', function(isSynced) {

        // console.log(firepad.getText());
        let newVal = self.firepad.getText();

        // updating data in database
        let codeRef = database().ref(`code-sessions/${session_id}`);
        codeRef.child("content").set(newVal);
        
      });
        
      // changing 'readOnly' state of editor
      this.codeRef = database().ref(`code-sessions/${session_id}`);
      this.codeRef.on("value", function(snapshot) {

        // setting 'readOnly' option
        if(self.state.isCreator){
          // self.codemirror.getCodeMirror().setOption("readOnly", false);
          self.codemirror.setOption("readOnly", false);
        } else {
          // self.codemirror.getCodeMirror().setOption("readOnly", snapshot.val().readOnly);
          self.codemirror.setOption("readOnly", snapshot.val().readOnly);
        }

      });

    })
    .catch(e => {
      // no session found corresponding to "sessionid" passed in the params
      this.firepad.dispose();
      self.codemirror.setValue("No Session Found!");
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

  // sidebar toggle handler
  drawerToggleClickHandler = () => {
    this.setState((prevState) => {
      return { sideDrawerOpen: !prevState.sideDrawerOpen };
    });
  };

  // backdrop (dull background) handler
  backdropClickHandler = () => {
    this.setState({ sideDrawerOpen: false });
  };
 
  // read only toggle handler
  toggleReadOnly = () => {
    this.setState({
			readOnly: !this.state.readOnly
    }, () => this.codemirror.focus());
    // updating readOnly in database
    this.codeRef.child("readOnly").set(!this.state.readOnly);
  };

  // editor language handler
  changeMode = (e) => {
		var mode = e.target.value;
		this.setState({
			mode: mode
    });
    // setting new language mode in the editor
    this.codemirror.setOption("mode", mode);
	};

  render() {

    let backdrop;
    if (this.state.sideDrawerOpen) {
      backdrop = <Backdrop click={this.backdropClickHandler} />
    }

    // readOnly toggle is only displayed when current user is the creator of session
    let readOnlyToggle;
    if (this.state.isCreator) {
      readOnlyToggle = 
        <button 
          className="btn-coding margin-l-10 toggle-btn" 
          onClick={this.toggleReadOnly}>
            {this.state.readOnly 
            ? <FontAwesomeIcon icon={faToggleOn} /> 
            : <FontAwesomeIcon icon={faToggleOff} />}
        </button>
    }

    // this button is only displayed to the users-connected (not the creator)
    let userEditingToggle;
    if (!this.state.isCreator) {
      userEditingToggle = 
        <button
          ref={button => {
            this.userEditingToggleBtn = button;
          }}
          className="btn-user-editing margin-l-10" 
          onClick={null}>
            {this.state.readOnly 
            ? 'Editing: Disabled' 
            : 'Editing: Enabled'}
        </button>
    }

    return (
      <React.Fragment>

        <Header
          style={{ background: "#1d1f27" }}
          extras={
            <div>
              {this.state.createdon
                ? `Created On: ${this.state.createdon}`
                : ""}

              <select className="btn-coding margin-l-10 mode-dropdown" 
                onChange={this.changeMode} 
                value={this.state.mode} >
                <option value="xml">Markdown</option>
                <option value="javascript">JavaScript</option>
                <option value="text/x-csrc">C</option>
                <option value="text/x-c++src">C++</option>
                <option value="text/x-java">Java</option>
                <option value="python">Python</option>
              </select>

              { readOnlyToggle }
              { userEditingToggle }

              <button className="btn-coding margin-l-10" onClick={this.handleLogout}>
                Sign Out
              </button>
              
              <button className="btn-coding margin-l-10" onClick={this.drawerToggleClickHandler}>
                <FontAwesomeIcon icon={faBars} />
              </button>
            </div>
          }
        />

        <SideDrawer show={this.state.sideDrawerOpen} session_id={this.props.match.params.sessionid} />
        { backdrop }

        <div ref={r => (this.firepadDiv = r)}></div>
        
      </React.Fragment>
    );
  }

}

// exporting creator info object
export {creatorInfo};