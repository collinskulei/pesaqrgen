import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Phone, Building2, Download, Printer, AlertCircle } from 'lucide-react';
import { crc16ccitt } from './utils/crc16';

type PaymentType = 'paybill' | 'till' | 'phone';

function App() {
  const [paymentType, setPaymentType] = useState<PaymentType>('paybill');
  const [number, setNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const validateNumber = (value: string): boolean => {
    if (!value) return false;
    
    const cleaned = value.replace(/[^\d]/g, '');
    switch (paymentType) {
      case 'paybill':
        return /^\d{6}$/.test(cleaned);
      case 'till':
        return /^\d{5,6}$/.test(cleaned);
      case 'phone':
        if (cleaned.startsWith('254')) {
          return /^254[7]\d{8}$/.test(cleaned);
        }
        if (cleaned.startsWith('0')) {
          return /^0[7]\d{8}$/.test(cleaned);
        }
        return /^[7]\d{8}$/.test(cleaned);
      default:
        return false;
    }
  };

  const formatNumber = (value: string): string => {
    const cleaned = value.replace(/[^\d]/g, '');
    if (paymentType === 'phone') {
      if (cleaned.startsWith('254')) return cleaned;
      if (cleaned.startsWith('0')) return '254' + cleaned.slice(1);
      if (cleaned.length === 9) return '254' + cleaned;
    }
    return cleaned;
  };

  const generateQRValue = () => {
    try {
      if (!number) return '';

      const formattedNumber = formatNumber(number);
      if (!validateNumber(number)) {
        return '';
      }

      // MPQR Format Start
      let qrText = '000201'; // Payload Format Indicator
      qrText += '0102';       // Point of Initiation Method (Static)

      // Merchant Account Information Template (Tag 26)
      let merchantInfo = '';
      merchantInfo += '00' + '14' + 'A000000677010111'; // GUID (MPESA standard)

      if (paymentType === 'paybill') {
        merchantInfo += '01' + formattedNumber.length.toString().padStart(2, '0') + formattedNumber;
        if (accountNumber) {
          merchantInfo += '02' + accountNumber.length.toString().padStart(2, '0') + accountNumber;
        }
      } else if (paymentType === 'till') {
        merchantInfo += '03' + formattedNumber.length.toString().padStart(2, '0') + formattedNumber;
      } else {
        merchantInfo += '04' + formattedNumber.length.toString().padStart(2, '0') + formattedNumber;
      }

      qrText += '26' + merchantInfo.length.toString().padStart(2, '0') + merchantInfo;

      // Currency (KES)
      qrText += '5303KES';

      // Country Code (KE)
      qrText += '5802KE';

      // Merchant Name
      if (businessName) {
        qrText += '59' + businessName.length.toString().padStart(2, '0') + businessName;
      }

      // CRC
      qrText += '6304';
      const checksum = crc16ccitt(qrText);
      qrText += checksum;

      return qrText;
    } catch (e) {
      console.error("QR Generation Error:", e);
      return '';
   Text;
    } catch (err) {
      console.error('Error generating QR value:', err);
      return '';
    }
  };

  const downloadQR = () => {
    if (!validateNumber(number)) {
      setError('Please enter a valid number before downloading');
      return;
    }

    const svg = qrRef.current?.querySelector('svg');
    if (!svg) {
      setError('Error generating QR code');
      return;
    }

    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `mpesa-qr-${paymentType}-${formatNumber(number)}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (err) {
      console.error('Error downloading QR code:', err);
      setError('Error downloading QR code');
    }
  };

  const printQR = () => {
    if (!validateNumber(number)) {
      setError('Please enter a valid number before printing');
      return;
    }
    window.print();
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNumber(value);
    setError(null);
  };

  const handleAccountNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAccountNumber(value);
    setError(null);
  };

  const getPlaceholder = () => {
    switch (paymentType) {
      case 'paybill':
        return '123456';
      case 'till':
        return '12345';
      case 'phone':
        return '0712345678';
      default:
        return '';
    }
  };

  const shouldShowQR = number && validateNumber(number);
  const qrValue = generateQRValue();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <QrCode className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">M-Pesa QR Generator</h1>
          <p className="mt-2 text-gray-600">Generate QR codes for M-Pesa payments</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['paybill', 'till', 'phone'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setPaymentType(type);
                        setNumber('');
                        setAccountNumber('');
                        setError(null);
                      }}
                      className={`py-2 px-4 rounded-md text-sm font-medium capitalize
                        ${paymentType === type 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="number" className="block text-sm font-medium text-gray-700 mb-2">
                  {paymentType === 'paybill' ? 'Paybill Number' : 
                   paymentType === 'till' ? 'Till Number' : 'Phone Number'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {paymentType === 'phone' ? (
                      <Phone className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Building2 className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <input
                    type="text"
                    id="number"
                    value={number}
                    onChange={handleNumberChange}
                    className={`block w-full pl-10 pr-3 py-2 border rounded-md 
                             focus:ring-green-500 focus:border-green-500
                             ${error ? 'border-red-300' : 'border-gray-300'}`}
                    placeholder={getPlaceholder()}
                  />
                </div>
                {error && (
                  <div className="mt-2 flex items-center text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {error}
                  </div>
                )}
              </div>

              {paymentType === 'paybill' && (
                <div>
                  <label htmlFor="account" className="block text-sm font-medium text-gray-700 mb-2">
                    Account Number
                  </label>
                  <input
                    type="text"
                    id="account"
                    value={accountNumber}
                    onChange={handleAccountNumberChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md 
                             focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter account number"
                  />
                </div>
              )}

              <div>
                <label htmlFor="business" className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name (Optional)
                </label>
                <input
                  type="text"
                  id="business"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md 
                           focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter business name"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Generated QR Code</h2>
            <div 
              ref={qrRef}
              className="flex items-center justify-center bg-white p-4 rounded-lg border-2 border-dashed border-gray-200"
            >
              {shouldShowQR && qrValue ? (
                <QRCodeSVG
                  value={qrValue}
                  size={200}
                  level="M"
                  includeMargin={true}
                />
              ) : (
                <div className="text-center text-gray-500">
                  <QrCode className="w-16 h-16 mx-auto mb-2 opacity-50" />
                  <p>{error || 'Enter valid payment details to generate QR code'}</p>
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={downloadQR}
                disabled={!shouldShowQR || !qrValue}
                className="flex items-center justify-center px-4 py-2 border border-transparent 
                         rounded-md shadow-sm text-sm font-medium text-white bg-green-600 
                         hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </button>
              <button
                onClick={printQR}
                disabled={!shouldShowQR || !qrValue}
                className="flex items-center justify-center px-4 py-2 border border-transparent 
                         rounded-md shadow-sm text-sm font-medium text-white bg-green-600 
                         hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;