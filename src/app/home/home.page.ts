import { Component, OnInit } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { MenuController } from '@ionic/angular';
import axios from 'axios';
import { Preferences } from '@capacitor/preferences';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  currentWeather: any = null;
  currentForecast: any = null;


  searchedWeather: any = null;
  searchQuery: string = '';
  showModal: boolean = false; 

  // Customization settings
  temperatureUnit: string = 'metric'; 
  enableAlerts: boolean = false; 
  appTheme: string = 'dark'; 

  isOnline: boolean = navigator.onLine; // Initialize with the current online status

  private apiKey: string = 'YOUR_API_KEY';
  private weatherUrl: string = 'https://api.openweathermap.org/data/2.5/weather';
  private forecastUrl: string = 'https://api.openweathermap.org/data/2.5/forecast';

  constructor(private menuCtrl: MenuController) {
    // Listen for online/offline events
    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('You are offline. Cached data will be used.');
    });

    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('You are back online. Fetching live data...');
      this.getWeatherForCurrentLocation();
    });
  }

  async ngOnInit() {
    // Set theme
    document.body.setAttribute('color-theme', this.appTheme);

    // Load cached data if available
    const cachedWeather = await Preferences.get({ key: 'currentWeather' });
    const cachedForecast = await Preferences.get({ key: 'currentForecast' });
    if (cachedWeather.value) this.currentWeather = JSON.parse(cachedWeather.value);
    if (cachedForecast.value) this.currentForecast = JSON.parse(cachedForecast.value);

    // Fetch live data if online
    if (this.isOnline) {
      this.getWeatherForCurrentLocation();
    }
  }

  // Auto-detect user's current location
  async getWeatherForCurrentLocation() {
    try {
      const coordinates = await Geolocation.getCurrentPosition();
      const lat = coordinates.coords.latitude;
      const lon = coordinates.coords.longitude;

      // Fetch and cache current weather
      this.currentWeather = await this.getWeatherByCoords(lat, lon);
      await Preferences.set({ key: 'currentWeather', value: JSON.stringify(this.currentWeather) });

      // Fetch and cache forecast
      this.currentForecast = await this.getForecastByCoords(lat, lon);
      await Preferences.set({ key: 'currentForecast', value: JSON.stringify(this.currentForecast) });
    } catch (error) {
      console.error('Error getting location:', error);

      // Load cached data if available
      const cachedWeather = await Preferences.get({ key: 'currentWeather' });
      const cachedForecast = await Preferences.get({ key: 'currentForecast' });
      if (cachedWeather.value) this.currentWeather = JSON.parse(cachedWeather.value);
      if (cachedForecast.value) this.currentForecast = JSON.parse(cachedForecast.value);
    }
  }

  // Fetch weather using coordinates
  async getWeatherByCoords(lat: number, lon: number) {
    try {
      const response = await axios.get(
        `${this.weatherUrl}?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=${this.temperatureUnit}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching weather:', error);
      return null;
    }
  }

  async getForecastByCoords(lat: number, lon: number) {
    try {
      const response = await axios.get(
        `${this.forecastUrl}?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=${this.temperatureUnit}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching forecast:', error);
      return null;
    }
  }

  // Fetch weather for searched city and show modal
  async getWeatherForSearch() {
    if (!this.searchQuery) return;

    try {
      const weatherResponse = await axios.get(
        `${this.weatherUrl}?q=${this.searchQuery}&appid=${this.apiKey}&units=${this.temperatureUnit}`
      );
      this.searchedWeather = weatherResponse.data;

      // Cache searched weather
      await Preferences.set({ key: 'searchedWeather', value: JSON.stringify(this.searchedWeather) });

      this.showModal = true; // Open modal after fetching data
      this.searchQuery = ''; // Clear the search textbox
    } catch (error) {
      console.error('Error fetching searched location weather:', error);

      // Load cached searched weather if available
      const cachedSearchedWeather = await Preferences.get({ key: 'searchedWeather' });
      if (cachedSearchedWeather.value) {
        this.searchedWeather = JSON.parse(cachedSearchedWeather.value);
        this.showModal = true; // Open modal with cached data
      }
    }
  }

  closeModal() {
    this.showModal = false;
  }

  // Toggle the settings menu
  toggleSettings() {
    this.menuCtrl.toggle('settingsMenu'); // Ensure 'settingsMenu' matches the menuId in the HTML
  }

  // Update temperature unit
  updateTemperatureUnit() {
    console.log('Temperature unit updated to:', this.temperatureUnit);

    // Refetch current location weather and forecast
    if (this.currentWeather) {
      const lat = this.currentWeather.coord.lat;
      const lon = this.currentWeather.coord.lon;
      this.getWeatherByCoords(lat, lon).then((weather) => {
        this.currentWeather = weather;
      });
      this.getForecastByCoords(lat, lon).then((forecast) => {
        this.currentForecast = forecast;
      });
    }

    // Refetch searched location weather and forecast if modal is open
    if (this.searchedWeather) {
      const cityName = this.searchedWeather.name;
      axios
        .get(`${this.weatherUrl}?q=${cityName}&appid=${this.apiKey}&units=${this.temperatureUnit}`)
        .then((response) => {
          this.searchedWeather = response.data;
        })
        .catch((error) => {
          console.error('Error updating searched location weather:', error);
        });
    }
  }

  // Toggle severe weather alerts
  toggleAlerts() {
    console.log('Severe weather alerts enabled:', this.enableAlerts);
    // Add logic to enable/disable notifications
  }

  // Update app theme
  updateTheme() {
    console.log('App theme updated to:', this.appTheme);
    document.body.setAttribute('color-theme', this.appTheme);
  }
}
