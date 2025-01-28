const API_URL = process.env.NODE_ENV === 'production' 
? '/api'
: 'http://localhost:3000/api';

// new comment

export const fetchProviders = async () => {
  try {
    const response = await fetch(`/api/providers`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      mode: 'cors'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error('Failed to fetch providers:', error);
    throw error;
  }
};

export const fetchApplianceProviders = async () => {
  try {
    const response = await fetch(`/api/applianceProviders`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      mode: 'cors'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error('Failed to fetch appliance providers:', error);
    throw error;
  }
};

export const fetchCleaningProviders = async () => {
  try {
    const response = await fetch(`/api/cleaningProviders`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      mode: 'cors'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error('Failed to fetch cleaning providers:', error);
    throw error;
  }
};

export const fetchUtilitiesProviders = async () => {
  try {
    const response = await fetch(`/api/utilitiesProviders`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      mode: 'cors'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error('Failed to fetch utilities providers:', error);
    throw error;
  }
};

export const fetchRepairProviders = async () => {
  try {
    const response = await fetch(`/api/repairProviders`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      mode: 'cors'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error('Failed to fetch repair providers:', error);
    throw error;
  }
};

export const fetchOutdoorProviders = async () => {
  try {
    const response = await fetch(`/api/outdoorProviders`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      mode: 'cors'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error('Failed to fetch outdoor providers:', error);
    throw error;
  }
};

export const fetchMovingProviders = async () => {
  try {
    const response = await fetch(`/api/movingProviders`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      mode: 'cors'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error('Failed to fetch moving providers:', error);
    throw error;
  }
};


// // services/providerService.js
// const API_URL = 'http://localhost:3000/api';

// export const fetchProviders = async () => {
//   try {
//     console.log('Fetching providers from:', `${API_URL}/providers`);
    
//     const response = await fetch(`${API_URL}/providers`, {
//       method: 'GET',
//       headers: {
//         'Accept': 'application/json',
//         'Content-Type': 'application/json'
//       },
//       mode: 'cors'  // Enable CORS
//     });

//     if (!response.ok) {
//       console.error('Response not OK:', response.status, response.statusText);
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }
    
//     const data = await response.json();
//     console.log('Provider data received:', data);
//     return data;
    
//   } catch (error) {
//     console.error('Failed to fetch providers:', error);
//     throw error;
//   }
// };

// export const fetchApplianceProviders = async () => {
//   try {
//     console.log('Fetching appliance providers from:', `${API_URL}/applianceProviders`);
    
//     const response = await fetch(`${API_URL}/applianceProviders`, {
//       method: 'GET',
//       headers: {
//         'Accept': 'application/json',
//         'Content-Type': 'application/json'
//       },
//       mode: 'cors'
//     });

//     if (!response.ok) {
//       console.error('Response not OK:', response.status, response.statusText);
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }
    
//     const data = await response.json();
//     console.log('Appliance provider data received:', data);
//     return data;
    
//   } catch (error) {
//     console.error('Failed to fetch appliance providers:', error);
//     throw error;
//   }
// };

// export const fetchCleaningProviders = async () => {
//   try {
//     console.log('Fetching cleaning providers from:', `${API_URL}/cleaningProviders`);
    
//     const response = await fetch(`${API_URL}/cleaningProviders`, {
//       method: 'GET',
//       headers: {
//         'Accept': 'application/json',
//         'Content-Type': 'application/json'
//       },
//       mode: 'cors'
//     });

//     if (!response.ok) {
//       console.error('Response not OK:', response.status, response.statusText);
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }
    
//     const data = await response.json();
//     console.log('Cleaning provider data received:', data);
//     return data;
    
//   } catch (error) {
//     console.error('Failed to fetch cleaning providers:', error);
//     throw error;
//   }
// };

// export const fetchUtilitiesProviders = async () => {
//   try {
//     console.log('Fetching utilities providers from:', `${API_URL}/utilitiesProviders`);
    
//     const response = await fetch(`${API_URL}/utilitiesProviders`, {
//       method: 'GET',
//       headers: {
//         'Accept': 'application/json',
//         'Content-Type': 'application/json'
//       },
//       mode: 'cors'
//     });

//     if (!response.ok) {
//       console.error('Response not OK:', response.status, response.statusText);
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }
    
//     const data = await response.json();
//     console.log('Utilities provider data received:', data);
//     return data;
    
//   } catch (error) {
//     console.error('Failed to fetch utilities providers:', error);
//     throw error;
//   }
// };

// export const fetchRepairProviders = async () => {
//   try {
//     console.log('Fetching repair providers from:', `${API_URL}/repairProviders`);
    
//     const response = await fetch(`${API_URL}/repairProviders`, {
//       method: 'GET',
//       headers: {
//         'Accept': 'application/json',
//         'Content-Type': 'application/json'
//       },
//       mode: 'cors'
//     });

//     if (!response.ok) {
//       console.error('Response not OK:', response.status, response.statusText);
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }
    
//     const data = await response.json();
//     console.log('Repair provider data received:', data);
//     return data;
    
//   } catch (error) {
//     console.error('Failed to fetch repair providers:', error);
//     throw error;
//   }
// };

// export const fetchOutdoorProviders = async () => {
//   try {
//     console.log('Fetching outdoor providers from:', `${API_URL}/outdoorProviders`);
    
//     const response = await fetch(`${API_URL}/outdoorProviders`, {
//       method: 'GET',
//       headers: {
//         'Accept': 'application/json',
//         'Content-Type': 'application/json'
//       },
//       mode: 'cors'
//     });

//     if (!response.ok) {
//       console.error('Response not OK:', response.status, response.statusText);
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }
    
//     const data = await response.json();
//     console.log('Outdoor provider data received:', data);
//     return data;
    
//   } catch (error) {
//     console.error('Failed to fetch outdoor providers:', error);
//     throw error;
//   }
// };

// export const fetchMovingProviders = async () => {
//   try {
//     console.log('Fetching moving providers from:', `${API_URL}/movingProviders`);
    
//     const response = await fetch(`${API_URL}/movingProviders`, {
//       method: 'GET',
//       headers: {
//         'Accept': 'application/json',
//         'Content-Type': 'application/json'
//       },
//       mode: 'cors'
//     });

//     if (!response.ok) {
//       console.error('Response not OK:', response.status, response.statusText);
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }
    
//     const data = await response.json();
//     console.log('Moving provider data received:', data);
//     return data;
    
//   } catch (error) {
//     console.error('Failed to fetch moving providers:', error);
//     throw error;
//   }
// };


// // const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';

// // export const fetchProviders = async () => {
// //   console.log('fetchProviders function called');
// //   console.log('Using API URL:', `${API_BASE_URL}/providers`);

// //   try {
// //     console.log('Starting fetch request...');
// //     const response = await fetch(`${API_BASE_URL}/providers`, {
// //       method: 'GET',
// //       headers: {
// //         'Accept': 'application/json',
// //         'Content-Type': 'application/json',
// //       },
// //       credentials: 'include'
// //     });
    
// //     console.log('Response received:', {
// //       status: response.status,
// //       statusText: response.statusText,
// //       headers: Object.fromEntries(response.headers.entries())
// //     });

// //     if (!response.ok) {
// //       throw new Error(`HTTP error! status: ${response.status}`);
// //     }

// //     const data = await response.json();
// //     console.log('Raw data received:', data);

// //     const mappedData = data.map(provider => ({
// //       id: provider.id,
// //       business_name: provider.business_name,
// //       role: provider.description,
// //       service_type: provider.service_type,
// //       recommended_by_name: provider.recommended_by_name
// //     }));

// //     console.log('Mapped data:', mappedData);
// //     return mappedData;

// //   } catch (error) {
// //     console.error('Detailed error information:', {
// //       message: error.message,
// //       stack: error.stack,
// //       name: error.name
// //     });
// //     throw error;
// //   }
// // };


// // export const fetchProviders = async () => {
// //     try {
// //       const response = await fetch('/api/providers');
// //       console.log('API Response:', response);
// //       const data = await response.json();
// //       console.log('Parsed API data:', data);
// //       return data;
// //     } catch (error) {
// //       console.error('Fetch error:', error);
// //       throw error;
// //     }
// //   };



// // const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// // export const fetchProviders = async () => {
// //   try {
// //     const response = await fetch(`${API_URL}/api/providers/financial`);
// //     if (!response.ok) {
// //       throw new Error('Network response was not ok');
// //     }
// //     return await response.json();
// //   } catch (error) {
// //     console.error('Error fetching providers:', error);
// //     throw error;
// //   }
// // };

// // services/providerService.js
// // export const fetchProviders = async () => {
// //     // Mock data for testing
// //     return [
// //       {
// //         id: '1',
// //         business_name: 'Mike Makker',
// //         role: 'CPA, CGMA',
// //         service_type: 'Tax Preparation',
// //         recommended_by_name: 'Mani Sundaram'
// //       }
// //     ];
// //   };

// // services/providerService.js
// // export const fetchProviders = async () => {
// //     try {
// //       const response = await fetch('/api/providers');
// //       if (!response.ok) {
// //         throw new Error('Network response was not ok');
// //       }
// //       return await response.json();
// //     } catch (error) {
// //       throw new Error('Failed to fetch providers: ' + error.message);
// //     }
// //   };

// // export const fetchProviders = async () => {
// //     try {
// //       const response = await fetch('/api/routes/providers');
// //       if (!response.ok) {
// //         throw new Error(`HTTP error! status: ${response.status}`);
// //       }
// //       const data = await response.json();
// //       return data.map(provider => ({
// //         id: provider.id,
// //         business_name: provider.business_name,
// //         role: provider.description,
// //         service_type: provider.service_type,
// //         recommended_by_name: provider.recommended_by_name
// //       }));
// //     } catch (error) {
// //       throw new Error('Failed to fetch providers: ' + error.message);
// //     }
// //   };
  
  
