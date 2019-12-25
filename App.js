import React, { Component } from 'react'
import { Text, View, AsyncStorage, ActivityIndicator, StyleSheet, Alert, YellowBox, Image, Dimensions } from 'react-native'
import ImagePicker from 'react-native-image-crop-picker';
import ActionSheet from 'react-native-action-sheet'
import { Button, IconButton } from 'react-native-paper';
import codePush from 'react-native-code-push'
import Analytics from 'appcenter-analytics';
const SAVE_IMAGES = 'save_images';
const sw = Dimensions.get('screen').width;
const baseUrl = 'http://139.162.45.171:8000/api/v1/upload-files';
var BUTTONSandroid = [
  'Chụp ảnh từ Camera',
  'Chọn ảnh từ thư viện',
  'Huỷ'
];

var DESTRUCTIVE_INDEX = 3;
var CANCEL_INDEX = 3;
YellowBox.ignoreWarnings = true;
export class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: false,
      showListImage: false,
      page: 1,
      haveNextPage: false,
      havePrevPage: false,
      error: null,
    }
    this.arrayImage = [];
  }

  getFirstPage() {
    // this.codePushVersion = (await codePush.getUpdateMetadata()).label;
    try {
      this.fetchNewPage(baseUrl);
    } catch (error) {
      console.log('{checkMe} TCL --> error:', error);
    }
  }

  openActionSheet = () => {
    Analytics.trackEvent('upload_image');
    ActionSheet.showActionSheetWithOptions({
      options: (Platform.OS == 'ios') ? BUTTONSiOS : BUTTONSandroid,
      cancelButtonIndex: CANCEL_INDEX,
      destructiveButtonIndex: DESTRUCTIVE_INDEX,
      tintColor: 'blue'
    },
      (buttonIndex) => {
        if (buttonIndex === 0) {
          ImagePicker.openCamera({
            compressImageQuality: 0.8,
            compressImageMaxWidth: 2048,
            compressImageMaxHeight: 2048,
            cropping: true,
          }).then(image => {
            this.handleSelectedImages([image]);
          });
        } else if (buttonIndex === 1) {
          ImagePicker.openPicker({
            compressImageQuality: 0.8,
            compressImageMaxWidth: 2048,
            compressImageMaxHeight: 2048,
            cropping: true,
            multiple: true
          }).then(images => {
            if (Array.isArray(images)) {
              this.handleSelectedImages(images);
            }
            else {
              this.handleSelectedImages([images]);
            }
          });
        }
      });
  }
  handleSelectedImages = (images) => {

    images.forEach((selectImage) => {
      let lastIndex = selectImage.path.lastIndexOf("/");
      var fileName = selectImage.fileName;
      if (lastIndex >= 0) {
        fileName = selectImage.path.substr(lastIndex + 1);
      }
      this.arrayImage.push(selectImage.path);
    });
    // processing upload image to database:
    this.setState({ isLoading: true });
    var self = this;
    setTimeout(async () => {
      // await AsyncStorage.setItem(SAVE_IMAGES, JSON.stringify(this.arrayImage));
      self.uploadImage(self.arrayImage);
      // self.setState({ isLoading: false });

    }, 1000);
    console.log('{checkMe} TCL --> arrayImage:', this.arrayImage);


  }

  fetchNewPage(page, isFirst = false) {
    this.arrayImage = [];

    if (this.state.haveNextPage) {
      this.setState({ page: this.state.page + 1 });
    } else if (this.state.havePrevPage) {
      this.setState({ page: this.state.page - 1 });
    }
    try {
      let url = page;
      fetch(url).then(response => response.json()).then(apiResponse => {
        console.log('{checkMe} TCL --> api:', apiResponse);
        if (apiResponse.status === 'OK') {
          this.arrayImage = apiResponse.data.data;
          this.setState({
            haveNextPage: apiResponse.data.next_page_url,
            havePrevPage: apiResponse.data.prev_page_url
          });
        }
      })
    } catch (error) {
      console.log('{checkMe} TCL --> error:', error);
    }
  }

  postData(imagePath) {
    let data = new FormData();
    var photo = {
      uri: imagePath,
      type: 'image/jpeg',
      name: 'photo.jpg',
    };
    data.append("image", photo);
    console.log('{checkMe} TCL --> data:', data);
    fetch(baseUrl, {
      method: 'POST',
      body: data,
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    }).then(response => response.json()).then(response => {
      console.log('{checkMe} TCL --> reponse upload:', response);
    }).catch(error => {
      this.setState({ error: error });
    })
  }

  uploadImage = (images) => {
    this.setState({ isLoading: true });

    if (images.length > 1) {
      for (var i = 0; i < images.length; i++) {
        this.postData(images[i]);
      }
    } else {
      this.postData(images[0]);
    }
    this.setState({ isLoading: false });
    if (this.state.error) {
      Alert.alert('Status', 'Không thể đăng ảnh do lỗi :', JSON.stringify(this.state.error));
    } else {
      Alert.alert('Status', 'Đã đăng ảnh lên database');
    }

  }


  render() {
    if (this.state.isLoading) {
      return <View style={styles.container}>
        <ActivityIndicator size='large' color={'#7200ca'} />
        <Text style={{ color: '#7200ca' }}>Đang đăng ảnh lên database</Text>
      </View>
    }
    if (this.state.showListImage) {
      return <View style={{ flex: 1, flexWrap: 'wrap' }}>
        <View style={styles.topBar}>
          <IconButton
            icon={'arrow-left'}
            color={"white"}
            size={20}
            onPress={() => this.setState({ showListImage: false })}
          />
          <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>Những ảnh đã đăng</Text>
        </View>
        {Array.isArray(this.arrayImage) && this.arrayImage.length > 0 &&
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', flex: 1 }}>
            {this.arrayImage.map((data, index) => {
              return (
                <View key={index} style={{ borderWidth: 0.5, borderColor: 'black' }}>
                  <Image source={{ uri: data.url }} style={{ width: sw / 4 - 1, height: sw / 4 }} resizeMode={'contain'} />

                </View>
              )
            })}
          </View>

        }
        {Array.isArray(this.arrayImage) && this.arrayImage.length == 0 &&
          <View style={styles.container}>
            <Text style={{ color: '#7200ca', alignSelf: 'center' }}> Bạn chưa đăng ảnh nào lên database</Text>
          </View>
        }
        {/**bottom */}
        {Array.isArray(this.arrayImage) && this.arrayImage.length > 0 && <View style={{ position: 'absolute', bottom: 10, flexDirection: 'row', justifyContent: 'center', width: sw, alignItems: 'center' }}>
          <IconButton
            icon={'arrow-left'}
            color={"#7200ca"}
            size={20}
            disabled={!this.state.havePrevPage}
            onPress={() => { fetchNewPage(this.state.havePrevPage) }}
          />
          <Text style={{ color: '#7200ca', }}>Page: {this.state.page}</Text>
          <IconButton
            icon={'arrow-right'}
            color={"#7200ca"}
            size={20}
            disabled={!this.state.haveNextPage}
            onPress={() => { this.fetchNewPage(this.state.haveNextPage) }}
          />
        </View>}
      </View>
    }
    return (
      <View style={styles.container}>
        <Button mode={'contained'} onPress={this.openActionSheet}>Đăng ảnh lên database</Button>
        <Button style={{ marginTop: 10 }} onPress={() => {
          this.getFirstPage();
          this.setState({ showListImage: true })
        }}>Hiển thị ảnh đã đăng</Button>
        {this.codePushVersion && <Text style={{ position: 'absolute', bottom: 10 }}>version:{this.codePushVersion}</Text>}
      </View>
    )
  }
}

let AppCodePush = codePush({ checkFrequency: codePush.CheckFrequency.ON_APP_RESUME, installMode: codePush.InstallMode.ON_NEXT_RESUME })(App)
export default AppCodePush

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  topBar: {
    width: sw, height: 45, backgroundColor: '#7200ca',
    flexDirection: 'row',
    alignItems: 'center'
  }
})
